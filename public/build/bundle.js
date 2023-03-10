
(function(l, r) { if (!l || l.getElementById('livereloadscript')) return; r = l.createElement('script'); r.async = 1; r.src = '//' + (self.location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; r.id = 'livereloadscript'; l.getElementsByTagName('head')[0].appendChild(r) })(self.document);
var app = (function () {
    'use strict';

    function noop() { }
    function add_location(element, file, line, column, char) {
        element.__svelte_meta = {
            loc: { file, line, column, char }
        };
    }
    function run(fn) {
        return fn();
    }
    function blank_object() {
        return Object.create(null);
    }
    function run_all(fns) {
        fns.forEach(run);
    }
    function is_function(thing) {
        return typeof thing === 'function';
    }
    function safe_not_equal(a, b) {
        return a != a ? b == b : a !== b || ((a && typeof a === 'object') || typeof a === 'function');
    }
    function is_empty(obj) {
        return Object.keys(obj).length === 0;
    }
    function subscribe(store, ...callbacks) {
        if (store == null) {
            return noop;
        }
        const unsub = store.subscribe(...callbacks);
        return unsub.unsubscribe ? () => unsub.unsubscribe() : unsub;
    }
    function get_store_value(store) {
        let value;
        subscribe(store, _ => value = _)();
        return value;
    }
    function append(target, node) {
        target.appendChild(node);
    }
    function insert(target, node, anchor) {
        target.insertBefore(node, anchor || null);
    }
    function detach(node) {
        if (node.parentNode) {
            node.parentNode.removeChild(node);
        }
    }
    function destroy_each(iterations, detaching) {
        for (let i = 0; i < iterations.length; i += 1) {
            if (iterations[i])
                iterations[i].d(detaching);
        }
    }
    function element(name) {
        return document.createElement(name);
    }
    function text(data) {
        return document.createTextNode(data);
    }
    function space() {
        return text(' ');
    }
    function empty() {
        return text('');
    }
    function listen(node, event, handler, options) {
        node.addEventListener(event, handler, options);
        return () => node.removeEventListener(event, handler, options);
    }
    function attr(node, attribute, value) {
        if (value == null)
            node.removeAttribute(attribute);
        else if (node.getAttribute(attribute) !== value)
            node.setAttribute(attribute, value);
    }
    function children(element) {
        return Array.from(element.childNodes);
    }
    function set_input_value(input, value) {
        input.value = value == null ? '' : value;
    }
    function custom_event(type, detail, { bubbles = false, cancelable = false } = {}) {
        const e = document.createEvent('CustomEvent');
        e.initCustomEvent(type, bubbles, cancelable, detail);
        return e;
    }

    let current_component;
    function set_current_component(component) {
        current_component = component;
    }

    const dirty_components = [];
    const binding_callbacks = [];
    const render_callbacks = [];
    const flush_callbacks = [];
    const resolved_promise = Promise.resolve();
    let update_scheduled = false;
    function schedule_update() {
        if (!update_scheduled) {
            update_scheduled = true;
            resolved_promise.then(flush);
        }
    }
    function add_render_callback(fn) {
        render_callbacks.push(fn);
    }
    function add_flush_callback(fn) {
        flush_callbacks.push(fn);
    }
    // flush() calls callbacks in this order:
    // 1. All beforeUpdate callbacks, in order: parents before children
    // 2. All bind:this callbacks, in reverse order: children before parents.
    // 3. All afterUpdate callbacks, in order: parents before children. EXCEPT
    //    for afterUpdates called during the initial onMount, which are called in
    //    reverse order: children before parents.
    // Since callbacks might update component values, which could trigger another
    // call to flush(), the following steps guard against this:
    // 1. During beforeUpdate, any updated components will be added to the
    //    dirty_components array and will cause a reentrant call to flush(). Because
    //    the flush index is kept outside the function, the reentrant call will pick
    //    up where the earlier call left off and go through all dirty components. The
    //    current_component value is saved and restored so that the reentrant call will
    //    not interfere with the "parent" flush() call.
    // 2. bind:this callbacks cannot trigger new flush() calls.
    // 3. During afterUpdate, any updated components will NOT have their afterUpdate
    //    callback called a second time; the seen_callbacks set, outside the flush()
    //    function, guarantees this behavior.
    const seen_callbacks = new Set();
    let flushidx = 0; // Do *not* move this inside the flush() function
    function flush() {
        // Do not reenter flush while dirty components are updated, as this can
        // result in an infinite loop. Instead, let the inner flush handle it.
        // Reentrancy is ok afterwards for bindings etc.
        if (flushidx !== 0) {
            return;
        }
        const saved_component = current_component;
        do {
            // first, call beforeUpdate functions
            // and update components
            try {
                while (flushidx < dirty_components.length) {
                    const component = dirty_components[flushidx];
                    flushidx++;
                    set_current_component(component);
                    update(component.$$);
                }
            }
            catch (e) {
                // reset dirty state to not end up in a deadlocked state and then rethrow
                dirty_components.length = 0;
                flushidx = 0;
                throw e;
            }
            set_current_component(null);
            dirty_components.length = 0;
            flushidx = 0;
            while (binding_callbacks.length)
                binding_callbacks.pop()();
            // then, once components are updated, call
            // afterUpdate functions. This may cause
            // subsequent updates...
            for (let i = 0; i < render_callbacks.length; i += 1) {
                const callback = render_callbacks[i];
                if (!seen_callbacks.has(callback)) {
                    // ...so guard against infinite loops
                    seen_callbacks.add(callback);
                    callback();
                }
            }
            render_callbacks.length = 0;
        } while (dirty_components.length);
        while (flush_callbacks.length) {
            flush_callbacks.pop()();
        }
        update_scheduled = false;
        seen_callbacks.clear();
        set_current_component(saved_component);
    }
    function update($$) {
        if ($$.fragment !== null) {
            $$.update();
            run_all($$.before_update);
            const dirty = $$.dirty;
            $$.dirty = [-1];
            $$.fragment && $$.fragment.p($$.ctx, dirty);
            $$.after_update.forEach(add_render_callback);
        }
    }
    const outroing = new Set();
    let outros;
    function group_outros() {
        outros = {
            r: 0,
            c: [],
            p: outros // parent group
        };
    }
    function check_outros() {
        if (!outros.r) {
            run_all(outros.c);
        }
        outros = outros.p;
    }
    function transition_in(block, local) {
        if (block && block.i) {
            outroing.delete(block);
            block.i(local);
        }
    }
    function transition_out(block, local, detach, callback) {
        if (block && block.o) {
            if (outroing.has(block))
                return;
            outroing.add(block);
            outros.c.push(() => {
                outroing.delete(block);
                if (callback) {
                    if (detach)
                        block.d(1);
                    callback();
                }
            });
            block.o(local);
        }
        else if (callback) {
            callback();
        }
    }

    const globals = (typeof window !== 'undefined'
        ? window
        : typeof globalThis !== 'undefined'
            ? globalThis
            : global);

    function bind(component, name, callback) {
        const index = component.$$.props[name];
        if (index !== undefined) {
            component.$$.bound[index] = callback;
            callback(component.$$.ctx[index]);
        }
    }
    function create_component(block) {
        block && block.c();
    }
    function mount_component(component, target, anchor, customElement) {
        const { fragment, after_update } = component.$$;
        fragment && fragment.m(target, anchor);
        if (!customElement) {
            // onMount happens before the initial afterUpdate
            add_render_callback(() => {
                const new_on_destroy = component.$$.on_mount.map(run).filter(is_function);
                // if the component was destroyed immediately
                // it will update the `$$.on_destroy` reference to `null`.
                // the destructured on_destroy may still reference to the old array
                if (component.$$.on_destroy) {
                    component.$$.on_destroy.push(...new_on_destroy);
                }
                else {
                    // Edge case - component was destroyed immediately,
                    // most likely as a result of a binding initialising
                    run_all(new_on_destroy);
                }
                component.$$.on_mount = [];
            });
        }
        after_update.forEach(add_render_callback);
    }
    function destroy_component(component, detaching) {
        const $$ = component.$$;
        if ($$.fragment !== null) {
            run_all($$.on_destroy);
            $$.fragment && $$.fragment.d(detaching);
            // TODO null out other refs, including component.$$ (but need to
            // preserve final state?)
            $$.on_destroy = $$.fragment = null;
            $$.ctx = [];
        }
    }
    function make_dirty(component, i) {
        if (component.$$.dirty[0] === -1) {
            dirty_components.push(component);
            schedule_update();
            component.$$.dirty.fill(0);
        }
        component.$$.dirty[(i / 31) | 0] |= (1 << (i % 31));
    }
    function init(component, options, instance, create_fragment, not_equal, props, append_styles, dirty = [-1]) {
        const parent_component = current_component;
        set_current_component(component);
        const $$ = component.$$ = {
            fragment: null,
            ctx: [],
            // state
            props,
            update: noop,
            not_equal,
            bound: blank_object(),
            // lifecycle
            on_mount: [],
            on_destroy: [],
            on_disconnect: [],
            before_update: [],
            after_update: [],
            context: new Map(options.context || (parent_component ? parent_component.$$.context : [])),
            // everything else
            callbacks: blank_object(),
            dirty,
            skip_bound: false,
            root: options.target || parent_component.$$.root
        };
        append_styles && append_styles($$.root);
        let ready = false;
        $$.ctx = instance
            ? instance(component, options.props || {}, (i, ret, ...rest) => {
                const value = rest.length ? rest[0] : ret;
                if ($$.ctx && not_equal($$.ctx[i], $$.ctx[i] = value)) {
                    if (!$$.skip_bound && $$.bound[i])
                        $$.bound[i](value);
                    if (ready)
                        make_dirty(component, i);
                }
                return ret;
            })
            : [];
        $$.update();
        ready = true;
        run_all($$.before_update);
        // `false` as a special case of no DOM component
        $$.fragment = create_fragment ? create_fragment($$.ctx) : false;
        if (options.target) {
            if (options.hydrate) {
                const nodes = children(options.target);
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.l(nodes);
                nodes.forEach(detach);
            }
            else {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.c();
            }
            if (options.intro)
                transition_in(component.$$.fragment);
            mount_component(component, options.target, options.anchor, options.customElement);
            flush();
        }
        set_current_component(parent_component);
    }
    /**
     * Base class for Svelte components. Used when dev=false.
     */
    class SvelteComponent {
        $destroy() {
            destroy_component(this, 1);
            this.$destroy = noop;
        }
        $on(type, callback) {
            if (!is_function(callback)) {
                return noop;
            }
            const callbacks = (this.$$.callbacks[type] || (this.$$.callbacks[type] = []));
            callbacks.push(callback);
            return () => {
                const index = callbacks.indexOf(callback);
                if (index !== -1)
                    callbacks.splice(index, 1);
            };
        }
        $set($$props) {
            if (this.$$set && !is_empty($$props)) {
                this.$$.skip_bound = true;
                this.$$set($$props);
                this.$$.skip_bound = false;
            }
        }
    }

    function dispatch_dev(type, detail) {
        document.dispatchEvent(custom_event(type, Object.assign({ version: '3.55.1' }, detail), { bubbles: true }));
    }
    function append_dev(target, node) {
        dispatch_dev('SvelteDOMInsert', { target, node });
        append(target, node);
    }
    function insert_dev(target, node, anchor) {
        dispatch_dev('SvelteDOMInsert', { target, node, anchor });
        insert(target, node, anchor);
    }
    function detach_dev(node) {
        dispatch_dev('SvelteDOMRemove', { node });
        detach(node);
    }
    function listen_dev(node, event, handler, options, has_prevent_default, has_stop_propagation) {
        const modifiers = options === true ? ['capture'] : options ? Array.from(Object.keys(options)) : [];
        if (has_prevent_default)
            modifiers.push('preventDefault');
        if (has_stop_propagation)
            modifiers.push('stopPropagation');
        dispatch_dev('SvelteDOMAddEventListener', { node, event, handler, modifiers });
        const dispose = listen(node, event, handler, options);
        return () => {
            dispatch_dev('SvelteDOMRemoveEventListener', { node, event, handler, modifiers });
            dispose();
        };
    }
    function attr_dev(node, attribute, value) {
        attr(node, attribute, value);
        if (value == null)
            dispatch_dev('SvelteDOMRemoveAttribute', { node, attribute });
        else
            dispatch_dev('SvelteDOMSetAttribute', { node, attribute, value });
    }
    function prop_dev(node, property, value) {
        node[property] = value;
        dispatch_dev('SvelteDOMSetProperty', { node, property, value });
    }
    function set_data_dev(text, data) {
        data = '' + data;
        if (text.wholeText === data)
            return;
        dispatch_dev('SvelteDOMSetData', { node: text, data });
        text.data = data;
    }
    function validate_each_argument(arg) {
        if (typeof arg !== 'string' && !(arg && typeof arg === 'object' && 'length' in arg)) {
            let msg = '{#each} only iterates over array-like objects.';
            if (typeof Symbol === 'function' && arg && Symbol.iterator in arg) {
                msg += ' You can use a spread to convert this iterable into an array.';
            }
            throw new Error(msg);
        }
    }
    function validate_slots(name, slot, keys) {
        for (const slot_key of Object.keys(slot)) {
            if (!~keys.indexOf(slot_key)) {
                console.warn(`<${name}> received an unexpected slot "${slot_key}".`);
            }
        }
    }
    /**
     * Base class for Svelte components with some minor dev-enhancements. Used when dev=true.
     */
    class SvelteComponentDev extends SvelteComponent {
        constructor(options) {
            if (!options || (!options.target && !options.$$inline)) {
                throw new Error("'target' is a required option");
            }
            super();
        }
        $destroy() {
            super.$destroy();
            this.$destroy = () => {
                console.warn('Component was already destroyed'); // eslint-disable-line no-console
            };
        }
        $capture_state() { }
        $inject_state() { }
    }

    const subscriber_queue = [];
    /**
     * Creates a `Readable` store that allows reading by subscription.
     * @param value initial value
     * @param {StartStopNotifier}start start and stop notifications for subscriptions
     */
    function readable(value, start) {
        return {
            subscribe: writable(value, start).subscribe
        };
    }
    /**
     * Create a `Writable` store that allows both updating and reading by subscription.
     * @param {*=}value initial value
     * @param {StartStopNotifier=}start start and stop notifications for subscriptions
     */
    function writable(value, start = noop) {
        let stop;
        const subscribers = new Set();
        function set(new_value) {
            if (safe_not_equal(value, new_value)) {
                value = new_value;
                if (stop) { // store is ready
                    const run_queue = !subscriber_queue.length;
                    for (const subscriber of subscribers) {
                        subscriber[1]();
                        subscriber_queue.push(subscriber, value);
                    }
                    if (run_queue) {
                        for (let i = 0; i < subscriber_queue.length; i += 2) {
                            subscriber_queue[i][0](subscriber_queue[i + 1]);
                        }
                        subscriber_queue.length = 0;
                    }
                }
            }
        }
        function update(fn) {
            set(fn(value));
        }
        function subscribe(run, invalidate = noop) {
            const subscriber = [run, invalidate];
            subscribers.add(subscriber);
            if (subscribers.size === 1) {
                stop = start(set) || noop;
            }
            run(value);
            return () => {
                subscribers.delete(subscriber);
                if (subscribers.size === 0) {
                    stop();
                    stop = null;
                }
            };
        }
        return { set, update, subscribe };
    }

    function uuidv4() {
      return ([1e7]+-1e3+-4e3+-8e3+-1e11).replace(/[018]/g, c =>
        (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16)
      );
    }
    function scrollAnimation(container, target) {
      if(!document.querySelector(target)) return;
      
      document.querySelector(container).scrollTo({
        top: document.querySelector(target).offsetTop + 200,
        behavior: "smooth"
      });
    }
    function getCookie(cookieName) {
      let value = document.cookie.match('(^|;) ?' + cookieName + '=([^;]*)(;|$)');
      return value ? unescape(value[2]) : null;
    }
    function setCookie(cookieName, value, expire) {
      let date = new Date();
      date.setTime(date.getTime() + expire * 24 * 60 * 60 * 1000);
      document.cookie = `${cookieName}=${escape(value)};expires=${date.toUTCString()};path=/`;
    }
    function getComments(url, callback) {
      fetch(url, { method: "GET" })
        .then((response) => response.json())
        .then((data) => {
          if(callback && typeof callback === "function") callback(data);
        });
    }
    function postComments(url, params, callback) {
      let queries = Object.keys(params).map(el => {
          return typeof params[el] === "number"
            ? `${el}=${params[el]}`
            : `${el}=${params[el].replace(/\n/g, "<br>").replace(/&/g, "AND")}`
        }).join("&");

      fetch(url + `&${queries}`, { method: "POST"})
      .then((response) => {
        if(response.status === 200) callback(response);
      });
    }
    function dateSet(dataString){
      let date = dataString ? new Date(dataString) : new Date();
      let utc = date.getTime() + (date.getTimezoneOffset() * 60 * 1000);
      let koDate = new Date(utc + 32400000);

      let year = String(koDate.getFullYear()),
          month = String(koDate.getMonth()+1).length === 1 ? "0"+String(koDate.getMonth()+1) : String(koDate.getMonth()+1),
          days = String(koDate.getDate()).length === 1 ? "0"+String(koDate.getDate()) : String(koDate.getDate()),
          hours = String(koDate.getHours()).length === 1 ? "0"+String(koDate.getHours()) : String(koDate.getHours()),
          minutes = String(koDate.getMinutes()).length === 1 ? "0"+String(koDate.getMinutes()) : String(koDate.getMinutes());
          String(koDate.getSeconds()).length === 1 ? "0"+String(koDate.getSeconds()) : String(koDate.getSeconds());

      // return year+"-"+month+"-"+days+" "+hours+":"+minutes+":"+seconds;
      return `${year.substring(2)}.${month}.${days} ${hours}:${minutes}`
    }

    var Core = /*#__PURE__*/Object.freeze({
        __proto__: null,
        uuidv4: uuidv4,
        scrollAnimation: scrollAnimation,
        getCookie: getCookie,
        setCookie: setCookie,
        getComments: getComments,
        postComments: postComments,
        dateSet: dateSet
    });

    if(!getCookie("uuid")) setCookie("uuid", uuidv4(), 30);

    const UUID = writable(getCookie("uuid"));
    const COMMENTS = writable([]);
    const TAGS = writable([]);
    const SORTS = writable([]);
    const FILTER = writable({
      MINE: false,
      TAG: null,
    });
    const EDIT = writable(false);
    const EDITDATA = writable({
      KEY: null,
      TAG: null,
      SORT: null,
      CONTENTS: null,
    });
    const EXPIRE = writable(false);

    // export const API = readable("https://script.google.com/macros/s/AKfycbxFNHpsjwJkuH7jiiJP_w4e4wLby7CxcXbKf6FWuUIoKMXzmoP_fMsgFCn8gdepXM0b/exec");
    const API = readable("https://script.google.com/macros/s/AKfycbyf0rc9sJahK3K3LkopFxL6aiGqVQ9c5mh_joYGe9i5-BtmOdpICz6NkElb2OUYn_4gMQ/exec");
    const URL = readable(`${get_store_value(API)}?UUID=${get_store_value(UUID)}`);

    /* src/component/Comments.svelte generated by Svelte v3.55.1 */
    const file$2 = "src/component/Comments.svelte";

    function get_each_context$2(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[4] = list[i];
    	child_ctx[6] = i;
    	return child_ctx;
    }

    // (46:10) {#if !comment.PENDING && comment.UUID === get(UUID)  }
    function create_if_block$2(ctx) {
    	let button;
    	let mounted;
    	let dispose;

    	function click_handler() {
    		return /*click_handler*/ ctx[3](/*comment*/ ctx[4]);
    	}

    	const block = {
    		c: function create() {
    			button = element("button");
    			button.textContent = "??????";
    			attr_dev(button, "type", "button");
    			add_location(button, file$2, 46, 12, 1142);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, button, anchor);

    			if (!mounted) {
    				dispose = listen_dev(button, "click", click_handler, false, false, false);
    				mounted = true;
    			}
    		},
    		p: function update(new_ctx, dirty) {
    			ctx = new_ctx;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(button);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block$2.name,
    		type: "if",
    		source: "(46:10) {#if !comment.PENDING && comment.UUID === get(UUID)  }",
    		ctx
    	});

    	return block;
    }

    // (36:4) {#each comments as comment, i}
    function create_each_block$2(ctx) {
    	let li;
    	let div;
    	let p;
    	let t0_value = /*comment*/ ctx[4].SORT + "";
    	let t0;
    	let t1;
    	let h2;
    	let raw_value = /*comment*/ ctx[4].CONTENTS + "";
    	let t2;
    	let span;
    	let t3_value = /*comment*/ ctx[4].TIMESTAMP + "";
    	let t3;
    	let t4;
    	let show_if = !/*comment*/ ctx[4].PENDING && /*comment*/ ctx[4].UUID === get_store_value(UUID);
    	let t5;
    	let li_class_value;
    	let li_data_key_value;
    	let li_data_uuid_value;
    	let if_block = show_if && create_if_block$2(ctx);

    	const block = {
    		c: function create() {
    			li = element("li");
    			div = element("div");
    			p = element("p");
    			t0 = text(t0_value);
    			t1 = space();
    			h2 = element("h2");
    			t2 = space();
    			span = element("span");
    			t3 = text(t3_value);
    			t4 = space();
    			if (if_block) if_block.c();
    			t5 = space();
    			add_location(p, file$2, 42, 10, 955);
    			add_location(h2, file$2, 43, 10, 987);
    			add_location(span, file$2, 44, 10, 1032);
    			add_location(div, file$2, 41, 8, 939);

    			attr_dev(li, "class", li_class_value = "" + ((/*comment*/ ctx[4].UUID === get_store_value(UUID)
    			? "author"
    			: "blind") + " " + (/*comment*/ ctx[4].KEY === get_store_value(EDITDATA).KEY
    			? "edit"
    			: "")));

    			attr_dev(li, "data-key", li_data_key_value = /*comment*/ ctx[4].KEY);
    			attr_dev(li, "data-uuid", li_data_uuid_value = /*comment*/ ctx[4].UUID);
    			add_location(li, file$2, 36, 6, 733);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, li, anchor);
    			append_dev(li, div);
    			append_dev(div, p);
    			append_dev(p, t0);
    			append_dev(div, t1);
    			append_dev(div, h2);
    			h2.innerHTML = raw_value;
    			append_dev(div, t2);
    			append_dev(div, span);
    			append_dev(span, t3);
    			append_dev(div, t4);
    			if (if_block) if_block.m(div, null);
    			append_dev(li, t5);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*comments*/ 1 && t0_value !== (t0_value = /*comment*/ ctx[4].SORT + "")) set_data_dev(t0, t0_value);
    			if (dirty & /*comments*/ 1 && raw_value !== (raw_value = /*comment*/ ctx[4].CONTENTS + "")) h2.innerHTML = raw_value;			if (dirty & /*comments*/ 1 && t3_value !== (t3_value = /*comment*/ ctx[4].TIMESTAMP + "")) set_data_dev(t3, t3_value);
    			if (dirty & /*comments*/ 1) show_if = !/*comment*/ ctx[4].PENDING && /*comment*/ ctx[4].UUID === get_store_value(UUID);

    			if (show_if) {
    				if (if_block) {
    					if_block.p(ctx, dirty);
    				} else {
    					if_block = create_if_block$2(ctx);
    					if_block.c();
    					if_block.m(div, null);
    				}
    			} else if (if_block) {
    				if_block.d(1);
    				if_block = null;
    			}

    			if (dirty & /*comments*/ 1 && li_class_value !== (li_class_value = "" + ((/*comment*/ ctx[4].UUID === get_store_value(UUID)
    			? "author"
    			: "blind") + " " + (/*comment*/ ctx[4].KEY === get_store_value(EDITDATA).KEY
    			? "edit"
    			: "")))) {
    				attr_dev(li, "class", li_class_value);
    			}

    			if (dirty & /*comments*/ 1 && li_data_key_value !== (li_data_key_value = /*comment*/ ctx[4].KEY)) {
    				attr_dev(li, "data-key", li_data_key_value);
    			}

    			if (dirty & /*comments*/ 1 && li_data_uuid_value !== (li_data_uuid_value = /*comment*/ ctx[4].UUID)) {
    				attr_dev(li, "data-uuid", li_data_uuid_value);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(li);
    			if (if_block) if_block.d();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block$2.name,
    		type: "each",
    		source: "(36:4) {#each comments as comment, i}",
    		ctx
    	});

    	return block;
    }

    // (35:2) {#key editData }
    function create_key_block$2(ctx) {
    	let each_1_anchor;
    	let each_value = /*comments*/ ctx[0];
    	validate_each_argument(each_value);
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block$2(get_each_context$2(ctx, each_value, i));
    	}

    	const block = {
    		c: function create() {
    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			each_1_anchor = empty();
    		},
    		m: function mount(target, anchor) {
    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(target, anchor);
    			}

    			insert_dev(target, each_1_anchor, anchor);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*comments, get, UUID, EDITDATA, onChangeMode*/ 5) {
    				each_value = /*comments*/ ctx[0];
    				validate_each_argument(each_value);
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context$2(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block$2(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(each_1_anchor.parentNode, each_1_anchor);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value.length;
    			}
    		},
    		d: function destroy(detaching) {
    			destroy_each(each_blocks, detaching);
    			if (detaching) detach_dev(each_1_anchor);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_key_block$2.name,
    		type: "key",
    		source: "(35:2) {#key editData }",
    		ctx
    	});

    	return block;
    }

    function create_fragment$2(ctx) {
    	let ul;
    	let previous_key = /*editData*/ ctx[1];
    	let key_block = create_key_block$2(ctx);

    	const block = {
    		c: function create() {
    			ul = element("ul");
    			key_block.c();
    			add_location(ul, file$2, 33, 0, 668);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, ul, anchor);
    			key_block.m(ul, null);
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*editData*/ 2 && safe_not_equal(previous_key, previous_key = /*editData*/ ctx[1])) {
    				key_block.d(1);
    				key_block = create_key_block$2(ctx);
    				key_block.c();
    				key_block.m(ul, null);
    			} else {
    				key_block.p(ctx, dirty);
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(ul);
    			key_block.d(detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$2.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$2($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('Comments', slots, []);
    	let { comments } = $$props;
    	let editData;
    	EDITDATA.subscribe(obj => $$invalidate(1, editData = obj));

    	const onChangeMode = key => {
    		const selected = comments.filter(el => el.KEY === key)[0];

    		if (get_store_value(EDIT)) {
    			EDIT.set(false);
    			EDITDATA.update(obj => ({ KEY: null, SORT: null, CONTENTS: null }));
    		} else {
    			EDIT.set(true);

    			EDITDATA.update(obj => ({
    				KEY: selected.KEY,
    				SORT: selected.SORT,
    				CONTENTS: selected.CONTENTS.replace(/<br>/g, "\n")
    			}));
    		}
    	};

    	$$self.$$.on_mount.push(function () {
    		if (comments === undefined && !('comments' in $$props || $$self.$$.bound[$$self.$$.props['comments']])) {
    			console.warn("<Comments> was created without expected prop 'comments'");
    		}
    	});

    	const writable_props = ['comments'];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<Comments> was created with unknown prop '${key}'`);
    	});

    	const click_handler = comment => onChangeMode(comment.KEY);

    	$$self.$$set = $$props => {
    		if ('comments' in $$props) $$invalidate(0, comments = $$props.comments);
    	};

    	$$self.$capture_state = () => ({
    		get: get_store_value,
    		UUID,
    		EDITDATA,
    		EDIT,
    		comments,
    		editData,
    		onChangeMode
    	});

    	$$self.$inject_state = $$props => {
    		if ('comments' in $$props) $$invalidate(0, comments = $$props.comments);
    		if ('editData' in $$props) $$invalidate(1, editData = $$props.editData);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [comments, editData, onChangeMode, click_handler];
    }

    class Comments extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$2, create_fragment$2, safe_not_equal, { comments: 0 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Comments",
    			options,
    			id: create_fragment$2.name
    		});
    	}

    	get comments() {
    		throw new Error("<Comments>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set comments(value) {
    		throw new Error("<Comments>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src/component/InputForm.svelte generated by Svelte v3.55.1 */

    const { Object: Object_1 } = globals;

    const file$1 = "src/component/InputForm.svelte";

    function get_each_context$1(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[19] = list[i];
    	child_ctx[21] = i;
    	return child_ctx;
    }

    // (127:4) {#if sorts.length > 0}
    function create_if_block_1$1(ctx) {
    	let previous_key = /*sorts*/ ctx[1];
    	let key_block_anchor;
    	let key_block = create_key_block$1(ctx);

    	const block = {
    		c: function create() {
    			key_block.c();
    			key_block_anchor = empty();
    		},
    		m: function mount(target, anchor) {
    			key_block.m(target, anchor);
    			insert_dev(target, key_block_anchor, anchor);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*sorts*/ 2 && safe_not_equal(previous_key, previous_key = /*sorts*/ ctx[1])) {
    				key_block.d(1);
    				key_block = create_key_block$1(ctx);
    				key_block.c();
    				key_block.m(key_block_anchor.parentNode, key_block_anchor);
    			} else {
    				key_block.p(ctx, dirty);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(key_block_anchor);
    			key_block.d(detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_1$1.name,
    		type: "if",
    		source: "(127:4) {#if sorts.length > 0}",
    		ctx
    	});

    	return block;
    }

    // (130:10) {#if sort !== "?????????"}
    function create_if_block_2$1(ctx) {
    	let label;
    	let previous_key = /*editData*/ ctx[3];
    	let t0;
    	let t1_value = /*sort*/ ctx[19] + "";
    	let t1;
    	let t2;
    	let previous_key_1 = /*comments*/ ctx[0];
    	let t3;
    	let key_block0 = create_key_block_2$1(ctx);
    	let key_block1 = create_key_block_1$1(ctx);

    	const block = {
    		c: function create() {
    			label = element("label");
    			key_block0.c();
    			t0 = space();
    			t1 = text(t1_value);
    			t2 = space();
    			key_block1.c();
    			t3 = space();
    			add_location(label, file$1, 130, 12, 2870);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, label, anchor);
    			key_block0.m(label, null);
    			append_dev(label, t0);
    			append_dev(label, t1);
    			append_dev(label, t2);
    			key_block1.m(label, null);
    			append_dev(label, t3);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*editData*/ 8 && safe_not_equal(previous_key, previous_key = /*editData*/ ctx[3])) {
    				key_block0.d(1);
    				key_block0 = create_key_block_2$1(ctx);
    				key_block0.c();
    				key_block0.m(label, t0);
    			} else {
    				key_block0.p(ctx, dirty);
    			}

    			if (dirty & /*sorts, tagIndex*/ 6 && t1_value !== (t1_value = /*sort*/ ctx[19] + "")) set_data_dev(t1, t1_value);

    			if (dirty & /*comments*/ 1 && safe_not_equal(previous_key_1, previous_key_1 = /*comments*/ ctx[0])) {
    				key_block1.d(1);
    				key_block1 = create_key_block_1$1(ctx);
    				key_block1.c();
    				key_block1.m(label, t3);
    			} else {
    				key_block1.p(ctx, dirty);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(label);
    			key_block0.d(detaching);
    			key_block1.d(detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_2$1.name,
    		type: "if",
    		source: "(130:10) {#if sort !== \\\"?????????\\\"}",
    		ctx
    	});

    	return block;
    }

    // (139:16) {:else}
    function create_else_block_1(ctx) {
    	let input;
    	let input_value_value;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			input = element("input");
    			attr_dev(input, "type", "radio");
    			input.__value = input_value_value = /*sort*/ ctx[19];
    			input.value = input.__value;
    			/*$$binding_groups*/ ctx[12][1].push(input);
    			add_location(input, file$1, 139, 18, 3143);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, input, anchor);
    			input.checked = input.__value === /*formData*/ ctx[5].SORT;

    			if (!mounted) {
    				dispose = listen_dev(input, "change", /*input_change_handler_1*/ ctx[13]);
    				mounted = true;
    			}
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*sorts, tagIndex*/ 6 && input_value_value !== (input_value_value = /*sort*/ ctx[19])) {
    				prop_dev(input, "__value", input_value_value);
    				input.value = input.__value;
    			}

    			if (dirty & /*formData*/ 32) {
    				input.checked = input.__value === /*formData*/ ctx[5].SORT;
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(input);
    			/*$$binding_groups*/ ctx[12][1].splice(/*$$binding_groups*/ ctx[12][1].indexOf(input), 1);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block_1.name,
    		type: "else",
    		source: "(139:16) {:else}",
    		ctx
    	});

    	return block;
    }

    // (133:16) {#if editData.KEY}
    function create_if_block_3$1(ctx) {
    	let input;
    	let input_value_value;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			input = element("input");
    			attr_dev(input, "type", "radio");
    			input.__value = input_value_value = /*sort*/ ctx[19];
    			input.value = input.__value;
    			/*$$binding_groups*/ ctx[12][0].push(input);
    			add_location(input, file$1, 133, 18, 2961);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, input, anchor);
    			input.checked = input.__value === /*editData*/ ctx[3].SORT;

    			if (!mounted) {
    				dispose = listen_dev(input, "change", /*input_change_handler*/ ctx[11]);
    				mounted = true;
    			}
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*sorts, tagIndex*/ 6 && input_value_value !== (input_value_value = /*sort*/ ctx[19])) {
    				prop_dev(input, "__value", input_value_value);
    				input.value = input.__value;
    			}

    			if (dirty & /*editData*/ 8) {
    				input.checked = input.__value === /*editData*/ ctx[3].SORT;
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(input);
    			/*$$binding_groups*/ ctx[12][0].splice(/*$$binding_groups*/ ctx[12][0].indexOf(input), 1);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_3$1.name,
    		type: "if",
    		source: "(133:16) {#if editData.KEY}",
    		ctx
    	});

    	return block;
    }

    // (132:14) {#key editData}
    function create_key_block_2$1(ctx) {
    	let if_block_anchor;

    	function select_block_type(ctx, dirty) {
    		if (/*editData*/ ctx[3].KEY) return create_if_block_3$1;
    		return create_else_block_1;
    	}

    	let current_block_type = select_block_type(ctx);
    	let if_block = current_block_type(ctx);

    	const block = {
    		c: function create() {
    			if_block.c();
    			if_block_anchor = empty();
    		},
    		m: function mount(target, anchor) {
    			if_block.m(target, anchor);
    			insert_dev(target, if_block_anchor, anchor);
    		},
    		p: function update(ctx, dirty) {
    			if (current_block_type === (current_block_type = select_block_type(ctx)) && if_block) {
    				if_block.p(ctx, dirty);
    			} else {
    				if_block.d(1);
    				if_block = current_block_type(ctx);

    				if (if_block) {
    					if_block.c();
    					if_block.m(if_block_anchor.parentNode, if_block_anchor);
    				}
    			}
    		},
    		d: function destroy(detaching) {
    			if_block.d(detaching);
    			if (detaching) detach_dev(if_block_anchor);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_key_block_2$1.name,
    		type: "key",
    		source: "(132:14) {#key editData}",
    		ctx
    	});

    	return block;
    }

    // (148:14) {#key comments}
    function create_key_block_1$1(ctx) {
    	let span;
    	let t_value = /*countComments*/ ctx[9](/*sort*/ ctx[19]) + "";
    	let t;

    	const block = {
    		c: function create() {
    			span = element("span");
    			t = text(t_value);
    			add_location(span, file$1, 148, 16, 3393);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, span, anchor);
    			append_dev(span, t);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*sorts, tagIndex*/ 6 && t_value !== (t_value = /*countComments*/ ctx[9](/*sort*/ ctx[19]) + "")) set_data_dev(t, t_value);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(span);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_key_block_1$1.name,
    		type: "key",
    		source: "(148:14) {#key comments}",
    		ctx
    	});

    	return block;
    }

    // (129:8) {#each sorts[tagIndex] as sort, i}
    function create_each_block$1(ctx) {
    	let if_block_anchor;
    	let if_block = /*sort*/ ctx[19] !== "?????????" && create_if_block_2$1(ctx);

    	const block = {
    		c: function create() {
    			if (if_block) if_block.c();
    			if_block_anchor = empty();
    		},
    		m: function mount(target, anchor) {
    			if (if_block) if_block.m(target, anchor);
    			insert_dev(target, if_block_anchor, anchor);
    		},
    		p: function update(ctx, dirty) {
    			if (/*sort*/ ctx[19] !== "?????????") {
    				if (if_block) {
    					if_block.p(ctx, dirty);
    				} else {
    					if_block = create_if_block_2$1(ctx);
    					if_block.c();
    					if_block.m(if_block_anchor.parentNode, if_block_anchor);
    				}
    			} else if (if_block) {
    				if_block.d(1);
    				if_block = null;
    			}
    		},
    		d: function destroy(detaching) {
    			if (if_block) if_block.d(detaching);
    			if (detaching) detach_dev(if_block_anchor);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block$1.name,
    		type: "each",
    		source: "(129:8) {#each sorts[tagIndex] as sort, i}",
    		ctx
    	});

    	return block;
    }

    // (128:6) {#key sorts}
    function create_key_block$1(ctx) {
    	let each_1_anchor;
    	let each_value = /*sorts*/ ctx[1][/*tagIndex*/ ctx[2]];
    	validate_each_argument(each_value);
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block$1(get_each_context$1(ctx, each_value, i));
    	}

    	const block = {
    		c: function create() {
    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			each_1_anchor = empty();
    		},
    		m: function mount(target, anchor) {
    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(target, anchor);
    			}

    			insert_dev(target, each_1_anchor, anchor);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*comments, countComments, sorts, tagIndex, editData, formData*/ 559) {
    				each_value = /*sorts*/ ctx[1][/*tagIndex*/ ctx[2]];
    				validate_each_argument(each_value);
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context$1(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block$1(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(each_1_anchor.parentNode, each_1_anchor);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value.length;
    			}
    		},
    		d: function destroy(detaching) {
    			destroy_each(each_blocks, detaching);
    			if (detaching) detach_dev(each_1_anchor);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_key_block$1.name,
    		type: "key",
    		source: "(128:6) {#key sorts}",
    		ctx
    	});

    	return block;
    }

    // (168:4) {:else}
    function create_else_block$1(ctx) {
    	let textarea;
    	let t0;
    	let button;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			textarea = element("textarea");
    			t0 = space();
    			button = element("button");
    			button.textContent = "??????";
    			attr_dev(textarea, "rows", "3");
    			add_location(textarea, file$1, 168, 6, 3898);
    			attr_dev(button, "type", "button");
    			add_location(button, file$1, 173, 6, 4045);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, textarea, anchor);
    			set_input_value(textarea, /*formData*/ ctx[5].CONTENTS);
    			insert_dev(target, t0, anchor);
    			insert_dev(target, button, anchor);

    			if (!mounted) {
    				dispose = [
    					listen_dev(textarea, "change", /*change_handler_1*/ ctx[16], false, false, false),
    					listen_dev(textarea, "input", /*textarea_input_handler_1*/ ctx[17]),
    					listen_dev(button, "click", /*onClickSendComment*/ ctx[6], false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*formData*/ 32) {
    				set_input_value(textarea, /*formData*/ ctx[5].CONTENTS);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(textarea);
    			if (detaching) detach_dev(t0);
    			if (detaching) detach_dev(button);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block$1.name,
    		type: "else",
    		source: "(168:4) {:else}",
    		ctx
    	});

    	return block;
    }

    // (158:4) {#if editMode}
    function create_if_block$1(ctx) {
    	let textarea;
    	let t0;
    	let div;
    	let button0;
    	let t2;
    	let button1;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			textarea = element("textarea");
    			t0 = space();
    			div = element("div");
    			button0 = element("button");
    			button0.textContent = "??????";
    			t2 = space();
    			button1 = element("button");
    			button1.textContent = "??????";
    			attr_dev(textarea, "rows", "3");
    			add_location(textarea, file$1, 158, 6, 3568);
    			attr_dev(button0, "type", "button");
    			add_location(button0, file$1, 164, 8, 3729);
    			attr_dev(button1, "type", "button");
    			add_location(button1, file$1, 165, 8, 3801);
    			add_location(div, file$1, 163, 6, 3715);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, textarea, anchor);
    			set_input_value(textarea, /*editData*/ ctx[3].CONTENTS);
    			insert_dev(target, t0, anchor);
    			insert_dev(target, div, anchor);
    			append_dev(div, button0);
    			append_dev(div, t2);
    			append_dev(div, button1);

    			if (!mounted) {
    				dispose = [
    					listen_dev(textarea, "change", /*change_handler*/ ctx[14], false, false, false),
    					listen_dev(textarea, "input", /*textarea_input_handler*/ ctx[15]),
    					listen_dev(button0, "click", /*onClickEditComment*/ ctx[7], false, false, false),
    					listen_dev(button1, "click", /*onClickDeleteComment*/ ctx[8], false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*editData*/ 8) {
    				set_input_value(textarea, /*editData*/ ctx[3].CONTENTS);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(textarea);
    			if (detaching) detach_dev(t0);
    			if (detaching) detach_dev(div);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block$1.name,
    		type: "if",
    		source: "(158:4) {#if editMode}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$1(ctx) {
    	let form;
    	let div0;
    	let t;
    	let div1;
    	let form_class_value;
    	let if_block0 = /*sorts*/ ctx[1].length > 0 && create_if_block_1$1(ctx);

    	function select_block_type_1(ctx, dirty) {
    		if (/*editMode*/ ctx[4]) return create_if_block$1;
    		return create_else_block$1;
    	}

    	let current_block_type = select_block_type_1(ctx);
    	let if_block1 = current_block_type(ctx);

    	const block = {
    		c: function create() {
    			form = element("form");
    			div0 = element("div");
    			if (if_block0) if_block0.c();
    			t = space();
    			div1 = element("div");
    			if_block1.c();
    			add_location(div0, file$1, 125, 2, 2732);
    			add_location(div1, file$1, 156, 2, 3537);
    			attr_dev(form, "class", form_class_value = /*editMode*/ ctx[4] ? "edit" : "");
    			add_location(form, file$1, 124, 0, 2690);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, form, anchor);
    			append_dev(form, div0);
    			if (if_block0) if_block0.m(div0, null);
    			append_dev(form, t);
    			append_dev(form, div1);
    			if_block1.m(div1, null);
    		},
    		p: function update(ctx, [dirty]) {
    			if (/*sorts*/ ctx[1].length > 0) {
    				if (if_block0) {
    					if_block0.p(ctx, dirty);
    				} else {
    					if_block0 = create_if_block_1$1(ctx);
    					if_block0.c();
    					if_block0.m(div0, null);
    				}
    			} else if (if_block0) {
    				if_block0.d(1);
    				if_block0 = null;
    			}

    			if (current_block_type === (current_block_type = select_block_type_1(ctx)) && if_block1) {
    				if_block1.p(ctx, dirty);
    			} else {
    				if_block1.d(1);
    				if_block1 = current_block_type(ctx);

    				if (if_block1) {
    					if_block1.c();
    					if_block1.m(div1, null);
    				}
    			}

    			if (dirty & /*editMode*/ 16 && form_class_value !== (form_class_value = /*editMode*/ ctx[4] ? "edit" : "")) {
    				attr_dev(form, "class", form_class_value);
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(form);
    			if (if_block0) if_block0.d();
    			if_block1.d();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$1.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$1($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('InputForm', slots, []);
    	let { sorts } = $$props;
    	let { tagIndex } = $$props;
    	let { comments } = $$props;
    	let editData;
    	let filter;
    	let editMode;
    	FILTER.subscribe(obj => filter = obj);
    	EDIT.subscribe(bool => $$invalidate(4, editMode = bool));
    	EDITDATA.subscribe(obj => $$invalidate(3, editData = obj));
    	let formData = { TAG: null, SORT: 'ETC', CONTENTS: '' };

    	const onClickSendComment = () => {
    		if (!formData.CONTENTS) return;

    		let comment = {
    			...formData,
    			CONTENTS: formData.CONTENTS.replace(/\n/g, "<br>"),
    			TAG: filter.TAG,
    			TIMESTAMP: dateSet()
    		};

    		postComments(get_store_value(URL), comment, () => getComments(get_store_value(URL), data => {
    			COMMENTS.set(data.list);
    			SORTS.set(data.sort);
    		}));

    		comment.UUID = get_store_value(UUID);
    		comment.PENDING = "Y";
    		$$invalidate(0, comments = comments.concat(comment));

    		setTimeout(
    			() => {
    				scrollAnimation("main ul", "main ul > li:last-child");
    			},
    			150
    		);

    		$$invalidate(5, formData.CONTENTS = "", formData);
    	};

    	const onClickEditComment = () => {
    		let params = Object.assign(editData, { METHOD: "edit" });

    		postComments(get_store_value(URL), params, () => getComments(get_store_value(URL), data => {
    			COMMENTS.set(data.list);
    			SORTS.set(data.sort);
    		}));

    		$$invalidate(0, comments = comments.map(el => {
    			if (el.KEY === editData.KEY) {
    				return {
    					...el,
    					SORT: editData.SORT,
    					CONTENTS: editData.CONTENTS.replace(/\n/g, "<br>"),
    					PENDING: "Y"
    				};
    			} else {
    				return el;
    			}
    		}));

    		EDIT.set(false);

    		EDITDATA.set({
    			KEY: null,
    			TAG: null,
    			SORT: null,
    			CONTENTS: null
    		});

    		$$invalidate(5, formData.CONTENTS = "", formData);
    	};

    	const onClickDeleteComment = () => {
    		let params = { METHOD: "delete", KEY: editData.KEY };

    		postComments(get_store_value(URL), params, () => getComments(get_store_value(URL), data => {
    			COMMENTS.set(data.list);
    			SORTS.set(data.sort);
    		}));

    		$$invalidate(0, comments = comments.filter(el => el.KEY !== editData.KEY));
    		EDIT.set(false);

    		EDITDATA.set({
    			KEY: null,
    			TAG: null,
    			SORT: null,
    			CONTENTS: null
    		});

    		$$invalidate(5, formData.CONTENTS = "", formData);
    	};

    	const countComments = sort => {
    		return comments.filter(el => {
    			return el.TAG === get_store_value(TAGS)[tagIndex] && el.SORT === sort;
    		}).length;
    	};

    	const convetLineFeed = value => {
    		if (editMode) {
    			EDITDATA.update(obj => ({ ...obj, CONTETNS: value }));
    		} else {
    			$$invalidate(5, formData.CONTENTS = value, formData);
    		}
    	};

    	$$self.$$.on_mount.push(function () {
    		if (sorts === undefined && !('sorts' in $$props || $$self.$$.bound[$$self.$$.props['sorts']])) {
    			console.warn("<InputForm> was created without expected prop 'sorts'");
    		}

    		if (tagIndex === undefined && !('tagIndex' in $$props || $$self.$$.bound[$$self.$$.props['tagIndex']])) {
    			console.warn("<InputForm> was created without expected prop 'tagIndex'");
    		}

    		if (comments === undefined && !('comments' in $$props || $$self.$$.bound[$$self.$$.props['comments']])) {
    			console.warn("<InputForm> was created without expected prop 'comments'");
    		}
    	});

    	const writable_props = ['sorts', 'tagIndex', 'comments'];

    	Object_1.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<InputForm> was created with unknown prop '${key}'`);
    	});

    	const $$binding_groups = [[], []];

    	function input_change_handler() {
    		editData.SORT = this.__value;
    		$$invalidate(3, editData);
    	}

    	function input_change_handler_1() {
    		formData.SORT = this.__value;
    		$$invalidate(5, formData);
    	}

    	const change_handler = event => convetLineFeed(event.target.value);

    	function textarea_input_handler() {
    		editData.CONTENTS = this.value;
    		$$invalidate(3, editData);
    	}

    	const change_handler_1 = event => convetLineFeed(event.target.value);

    	function textarea_input_handler_1() {
    		formData.CONTENTS = this.value;
    		$$invalidate(5, formData);
    	}

    	$$self.$$set = $$props => {
    		if ('sorts' in $$props) $$invalidate(1, sorts = $$props.sorts);
    		if ('tagIndex' in $$props) $$invalidate(2, tagIndex = $$props.tagIndex);
    		if ('comments' in $$props) $$invalidate(0, comments = $$props.comments);
    	};

    	$$self.$capture_state = () => ({
    		get: get_store_value,
    		Core,
    		URL,
    		UUID,
    		TAGS,
    		FILTER,
    		SORTS,
    		COMMENTS,
    		EDIT,
    		EDITDATA,
    		sorts,
    		tagIndex,
    		comments,
    		editData,
    		filter,
    		editMode,
    		formData,
    		onClickSendComment,
    		onClickEditComment,
    		onClickDeleteComment,
    		countComments,
    		convetLineFeed
    	});

    	$$self.$inject_state = $$props => {
    		if ('sorts' in $$props) $$invalidate(1, sorts = $$props.sorts);
    		if ('tagIndex' in $$props) $$invalidate(2, tagIndex = $$props.tagIndex);
    		if ('comments' in $$props) $$invalidate(0, comments = $$props.comments);
    		if ('editData' in $$props) $$invalidate(3, editData = $$props.editData);
    		if ('filter' in $$props) filter = $$props.filter;
    		if ('editMode' in $$props) $$invalidate(4, editMode = $$props.editMode);
    		if ('formData' in $$props) $$invalidate(5, formData = $$props.formData);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [
    		comments,
    		sorts,
    		tagIndex,
    		editData,
    		editMode,
    		formData,
    		onClickSendComment,
    		onClickEditComment,
    		onClickDeleteComment,
    		countComments,
    		convetLineFeed,
    		input_change_handler,
    		$$binding_groups,
    		input_change_handler_1,
    		change_handler,
    		textarea_input_handler,
    		change_handler_1,
    		textarea_input_handler_1
    	];
    }

    class InputForm extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$1, create_fragment$1, safe_not_equal, { sorts: 1, tagIndex: 2, comments: 0 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "InputForm",
    			options,
    			id: create_fragment$1.name
    		});
    	}

    	get sorts() {
    		throw new Error("<InputForm>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set sorts(value) {
    		throw new Error("<InputForm>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get tagIndex() {
    		throw new Error("<InputForm>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set tagIndex(value) {
    		throw new Error("<InputForm>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get comments() {
    		throw new Error("<InputForm>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set comments(value) {
    		throw new Error("<InputForm>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src/App.svelte generated by Svelte v3.55.1 */
    const file = "src/App.svelte";

    function get_each_context(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[28] = list[i];
    	child_ctx[30] = i;
    	return child_ctx;
    }

    // (183:3) {:else}
    function create_else_block(ctx) {
    	let label;
    	let input;
    	let t;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			label = element("label");
    			input = element("input");
    			t = text("\n\t\t\t\t\t?????? ???");
    			attr_dev(input, "type", "checkbox");
    			add_location(input, file, 184, 5, 4316);
    			add_location(label, file, 183, 4, 4303);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, label, anchor);
    			append_dev(label, input);
    			append_dev(label, t);

    			if (!mounted) {
    				dispose = [
    					listen_dev(input, "click", /*adminCommand*/ ctx[9](250), false, false, false),
    					listen_dev(input, "change", /*mineComment*/ ctx[12], false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(label);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block.name,
    		type: "else",
    		source: "(183:3) {:else}",
    		ctx
    	});

    	return block;
    }

    // (175:3) {#if admin}
    function create_if_block_4(ctx) {
    	let label;
    	let input;
    	let t;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			label = element("label");
    			input = element("input");
    			t = text("\n\t\t\t\t\t?????? ???");
    			attr_dev(input, "type", "checkbox");
    			add_location(input, file, 176, 5, 4198);
    			add_location(label, file, 175, 4, 4185);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, label, anchor);
    			append_dev(label, input);
    			append_dev(label, t);

    			if (!mounted) {
    				dispose = listen_dev(input, "change", /*mineComment*/ ctx[12], false, false, false);
    				mounted = true;
    			}
    		},
    		p: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(label);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_4.name,
    		type: "if",
    		source: "(175:3) {#if admin}",
    		ctx
    	});

    	return block;
    }

    // (174:2) {#key admin}
    function create_key_block_3(ctx) {
    	let if_block_anchor;

    	function select_block_type(ctx, dirty) {
    		if (/*admin*/ ctx[8]) return create_if_block_4;
    		return create_else_block;
    	}

    	let current_block_type = select_block_type(ctx);
    	let if_block = current_block_type(ctx);

    	const block = {
    		c: function create() {
    			if_block.c();
    			if_block_anchor = empty();
    		},
    		m: function mount(target, anchor) {
    			if_block.m(target, anchor);
    			insert_dev(target, if_block_anchor, anchor);
    		},
    		p: function update(ctx, dirty) {
    			if (current_block_type === (current_block_type = select_block_type(ctx)) && if_block) {
    				if_block.p(ctx, dirty);
    			} else {
    				if_block.d(1);
    				if_block = current_block_type(ctx);

    				if (if_block) {
    					if_block.c();
    					if_block.m(if_block_anchor.parentNode, if_block_anchor);
    				}
    			}
    		},
    		d: function destroy(detaching) {
    			if_block.d(detaching);
    			if (detaching) detach_dev(if_block_anchor);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_key_block_3.name,
    		type: "key",
    		source: "(174:2) {#key admin}",
    		ctx
    	});

    	return block;
    }

    // (195:3) {#if admin}
    function create_if_block_2(ctx) {
    	let nav;
    	let each_value = /*sorts*/ ctx[5][/*tagCount*/ ctx[0]];
    	validate_each_argument(each_value);
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block(get_each_context(ctx, each_value, i));
    	}

    	const block = {
    		c: function create() {
    			nav = element("nav");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			add_location(nav, file, 195, 4, 4492);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, nav, anchor);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(nav, null);
    			}
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*sorts, tagCount, filter, changeFilter*/ 8229) {
    				each_value = /*sorts*/ ctx[5][/*tagCount*/ ctx[0]];
    				validate_each_argument(each_value);
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(nav, null);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value.length;
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(nav);
    			destroy_each(each_blocks, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_2.name,
    		type: "if",
    		source: "(195:3) {#if admin}",
    		ctx
    	});

    	return block;
    }

    // (198:6) {#if sort !== "?????????"}
    function create_if_block_3(ctx) {
    	let label;
    	let input;
    	let input_value_value;
    	let input_checked_value;
    	let t0;
    	let t1_value = /*sort*/ ctx[28] + "";
    	let t1;
    	let t2;
    	let mounted;
    	let dispose;

    	function change_handler(...args) {
    		return /*change_handler*/ ctx[15](/*i*/ ctx[30], ...args);
    	}

    	const block = {
    		c: function create() {
    			label = element("label");
    			input = element("input");
    			t0 = space();
    			t1 = text(t1_value);
    			t2 = space();
    			attr_dev(input, "type", "checkbox");
    			input.value = input_value_value = /*sort*/ ctx[28];
    			input.checked = input_checked_value = /*filter*/ ctx[2].SORT[/*tagCount*/ ctx[0]][/*i*/ ctx[30]];
    			add_location(input, file, 199, 8, 4588);
    			add_location(label, file, 198, 7, 4572);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, label, anchor);
    			append_dev(label, input);
    			append_dev(label, t0);
    			append_dev(label, t1);
    			append_dev(label, t2);

    			if (!mounted) {
    				dispose = listen_dev(input, "change", change_handler, false, false, false);
    				mounted = true;
    			}
    		},
    		p: function update(new_ctx, dirty) {
    			ctx = new_ctx;

    			if (dirty & /*sorts, tagCount*/ 33 && input_value_value !== (input_value_value = /*sort*/ ctx[28])) {
    				prop_dev(input, "value", input_value_value);
    			}

    			if (dirty & /*filter, tagCount*/ 5 && input_checked_value !== (input_checked_value = /*filter*/ ctx[2].SORT[/*tagCount*/ ctx[0]][/*i*/ ctx[30]])) {
    				prop_dev(input, "checked", input_checked_value);
    			}

    			if (dirty & /*sorts, tagCount*/ 33 && t1_value !== (t1_value = /*sort*/ ctx[28] + "")) set_data_dev(t1, t1_value);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(label);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_3.name,
    		type: "if",
    		source: "(198:6) {#if sort !== \\\"?????????\\\"}",
    		ctx
    	});

    	return block;
    }

    // (197:5) {#each sorts[tagCount] as sort, i}
    function create_each_block(ctx) {
    	let if_block_anchor;
    	let if_block = /*sort*/ ctx[28] !== "?????????" && create_if_block_3(ctx);

    	const block = {
    		c: function create() {
    			if (if_block) if_block.c();
    			if_block_anchor = empty();
    		},
    		m: function mount(target, anchor) {
    			if (if_block) if_block.m(target, anchor);
    			insert_dev(target, if_block_anchor, anchor);
    		},
    		p: function update(ctx, dirty) {
    			if (/*sort*/ ctx[28] !== "?????????") {
    				if (if_block) {
    					if_block.p(ctx, dirty);
    				} else {
    					if_block = create_if_block_3(ctx);
    					if_block.c();
    					if_block.m(if_block_anchor.parentNode, if_block_anchor);
    				}
    			} else if (if_block) {
    				if_block.d(1);
    				if_block = null;
    			}
    		},
    		d: function destroy(detaching) {
    			if (if_block) if_block.d(detaching);
    			if (detaching) detach_dev(if_block_anchor);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block.name,
    		type: "each",
    		source: "(197:5) {#each sorts[tagCount] as sort, i}",
    		ctx
    	});

    	return block;
    }

    // (194:2) {#key admin}
    function create_key_block_2(ctx) {
    	let if_block_anchor;
    	let if_block = /*admin*/ ctx[8] && create_if_block_2(ctx);

    	const block = {
    		c: function create() {
    			if (if_block) if_block.c();
    			if_block_anchor = empty();
    		},
    		m: function mount(target, anchor) {
    			if (if_block) if_block.m(target, anchor);
    			insert_dev(target, if_block_anchor, anchor);
    		},
    		p: function update(ctx, dirty) {
    			if (/*admin*/ ctx[8]) {
    				if (if_block) {
    					if_block.p(ctx, dirty);
    				} else {
    					if_block = create_if_block_2(ctx);
    					if_block.c();
    					if_block.m(if_block_anchor.parentNode, if_block_anchor);
    				}
    			} else if (if_block) {
    				if_block.d(1);
    				if_block = null;
    			}
    		},
    		d: function destroy(detaching) {
    			if (if_block) if_block.d(detaching);
    			if (detaching) detach_dev(if_block_anchor);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_key_block_2.name,
    		type: "key",
    		source: "(194:2) {#key admin}",
    		ctx
    	});

    	return block;
    }

    // (215:2) {#key filter}
    function create_key_block_1(ctx) {
    	let comments_1;
    	let current;

    	comments_1 = new Comments({
    			props: {
    				comments: /*commentSort*/ ctx[11](/*comments*/ ctx[1])
    			},
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			create_component(comments_1.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(comments_1, target, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const comments_1_changes = {};
    			if (dirty & /*comments*/ 2) comments_1_changes.comments = /*commentSort*/ ctx[11](/*comments*/ ctx[1]);
    			comments_1.$set(comments_1_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(comments_1.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(comments_1.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(comments_1, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_key_block_1.name,
    		type: "key",
    		source: "(215:2) {#key filter}",
    		ctx
    	});

    	return block;
    }

    // (219:2) {#if expire}
    function create_if_block_1(ctx) {
    	let span;

    	const block = {
    		c: function create() {
    			span = element("span");
    			span.textContent = "?????? ????????? ?????????????????????.";
    			add_location(span, file, 219, 3, 4947);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, span, anchor);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(span);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_1.name,
    		type: "if",
    		source: "(219:2) {#if expire}",
    		ctx
    	});

    	return block;
    }

    // (224:4) {#if news}
    function create_if_block(ctx) {
    	let button;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			button = element("button");
    			button.textContent = "????????? ?????????";
    			attr_dev(button, "type", "button");
    			add_location(button, file, 224, 5, 5065);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, button, anchor);

    			if (!mounted) {
    				dispose = listen_dev(button, "click", /*checkNewComment*/ ctx[14], false, false, false);
    				mounted = true;
    			}
    		},
    		p: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(button);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block.name,
    		type: "if",
    		source: "(224:4) {#if news}",
    		ctx
    	});

    	return block;
    }

    // (223:3) {#key news}
    function create_key_block(ctx) {
    	let if_block_anchor;
    	let if_block = /*news*/ ctx[4] && create_if_block(ctx);

    	const block = {
    		c: function create() {
    			if (if_block) if_block.c();
    			if_block_anchor = empty();
    		},
    		m: function mount(target, anchor) {
    			if (if_block) if_block.m(target, anchor);
    			insert_dev(target, if_block_anchor, anchor);
    		},
    		p: function update(ctx, dirty) {
    			if (/*news*/ ctx[4]) {
    				if (if_block) {
    					if_block.p(ctx, dirty);
    				} else {
    					if_block = create_if_block(ctx);
    					if_block.c();
    					if_block.m(if_block_anchor.parentNode, if_block_anchor);
    				}
    			} else if (if_block) {
    				if_block.d(1);
    				if_block = null;
    			}
    		},
    		d: function destroy(detaching) {
    			if (if_block) if_block.d(detaching);
    			if (detaching) detach_dev(if_block_anchor);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_key_block.name,
    		type: "key",
    		source: "(223:3) {#key news}",
    		ctx
    	});

    	return block;
    }

    function create_fragment(ctx) {
    	let div;
    	let header;
    	let a;
    	let t1;
    	let h1;
    	let button;
    	let t2;
    	let t3;
    	let previous_key = /*admin*/ ctx[8];
    	let t4;
    	let previous_key_1 = /*admin*/ ctx[8];
    	let t5;
    	let main;
    	let previous_key_2 = /*filter*/ ctx[2];
    	let t6;
    	let t7;
    	let section;
    	let previous_key_3 = /*news*/ ctx[4];
    	let t8;
    	let inputform;
    	let updating_comments;
    	let updating_tagIndex;
    	let updating_sorts;
    	let section_class_value;
    	let div_class_value;
    	let current;
    	let mounted;
    	let dispose;
    	let key_block0 = create_key_block_3(ctx);
    	let key_block1 = create_key_block_2(ctx);
    	let key_block2 = create_key_block_1(ctx);
    	let if_block = /*expire*/ ctx[3] && create_if_block_1(ctx);
    	let key_block3 = create_key_block(ctx);

    	function inputform_comments_binding(value) {
    		/*inputform_comments_binding*/ ctx[16](value);
    	}

    	function inputform_tagIndex_binding(value) {
    		/*inputform_tagIndex_binding*/ ctx[17](value);
    	}

    	function inputform_sorts_binding(value) {
    		/*inputform_sorts_binding*/ ctx[18](value);
    	}

    	let inputform_props = {};

    	if (/*comments*/ ctx[1] !== void 0) {
    		inputform_props.comments = /*comments*/ ctx[1];
    	}

    	if (/*tagCount*/ ctx[0] !== void 0) {
    		inputform_props.tagIndex = /*tagCount*/ ctx[0];
    	}

    	if (/*sorts*/ ctx[5] !== void 0) {
    		inputform_props.sorts = /*sorts*/ ctx[5];
    	}

    	inputform = new InputForm({ props: inputform_props, $$inline: true });
    	binding_callbacks.push(() => bind(inputform, 'comments', inputform_comments_binding));
    	binding_callbacks.push(() => bind(inputform, 'tagIndex', inputform_tagIndex_binding));
    	binding_callbacks.push(() => bind(inputform, 'sorts', inputform_sorts_binding));

    	const block = {
    		c: function create() {
    			div = element("div");
    			header = element("header");
    			a = element("a");
    			a.textContent = "F5";
    			t1 = space();
    			h1 = element("h1");
    			button = element("button");
    			t2 = text(/*title*/ ctx[6]);
    			t3 = space();
    			key_block0.c();
    			t4 = space();
    			key_block1.c();
    			t5 = space();
    			main = element("main");
    			key_block2.c();
    			t6 = space();
    			if (if_block) if_block.c();
    			t7 = space();
    			section = element("section");
    			key_block3.c();
    			t8 = space();
    			create_component(inputform.$$.fragment);
    			attr_dev(a, "href", "http://digitest.hankookilbo.com/others/workshop/");
    			add_location(a, file, 169, 2, 4007);
    			attr_dev(button, "type", "button");
    			add_location(button, file, 171, 3, 4083);
    			add_location(h1, file, 170, 2, 4075);
    			add_location(header, file, 168, 1, 3996);
    			attr_dev(section, "class", section_class_value = /*expire*/ ctx[3] ? "expire" : "");
    			add_location(section, file, 221, 2, 4986);
    			add_location(main, file, 213, 1, 4847);
    			attr_dev(div, "id", "app");
    			attr_dev(div, "class", div_class_value = "" + ((/*onload*/ ctx[7] ? "onload" : "") + " " + (/*admin*/ ctx[8] ? 'admin' : '')));
    			add_location(div, file, 167, 0, 3924);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, header);
    			append_dev(header, a);
    			append_dev(header, t1);
    			append_dev(header, h1);
    			append_dev(h1, button);
    			append_dev(button, t2);
    			append_dev(header, t3);
    			key_block0.m(header, null);
    			append_dev(header, t4);
    			key_block1.m(header, null);
    			append_dev(div, t5);
    			append_dev(div, main);
    			key_block2.m(main, null);
    			append_dev(main, t6);
    			if (if_block) if_block.m(main, null);
    			append_dev(main, t7);
    			append_dev(main, section);
    			key_block3.m(section, null);
    			append_dev(section, t8);
    			mount_component(inputform, section, null);
    			current = true;

    			if (!mounted) {
    				dispose = listen_dev(button, "click", /*changeTag*/ ctx[10], false, false, false);
    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (!current || dirty & /*title*/ 64) set_data_dev(t2, /*title*/ ctx[6]);

    			if (dirty & /*admin*/ 256 && safe_not_equal(previous_key, previous_key = /*admin*/ ctx[8])) {
    				key_block0.d(1);
    				key_block0 = create_key_block_3(ctx);
    				key_block0.c();
    				key_block0.m(header, t4);
    			} else {
    				key_block0.p(ctx, dirty);
    			}

    			if (dirty & /*admin*/ 256 && safe_not_equal(previous_key_1, previous_key_1 = /*admin*/ ctx[8])) {
    				key_block1.d(1);
    				key_block1 = create_key_block_2(ctx);
    				key_block1.c();
    				key_block1.m(header, null);
    			} else {
    				key_block1.p(ctx, dirty);
    			}

    			if (dirty & /*filter*/ 4 && safe_not_equal(previous_key_2, previous_key_2 = /*filter*/ ctx[2])) {
    				group_outros();
    				transition_out(key_block2, 1, 1, noop);
    				check_outros();
    				key_block2 = create_key_block_1(ctx);
    				key_block2.c();
    				transition_in(key_block2, 1);
    				key_block2.m(main, t6);
    			} else {
    				key_block2.p(ctx, dirty);
    			}

    			if (/*expire*/ ctx[3]) {
    				if (if_block) ; else {
    					if_block = create_if_block_1(ctx);
    					if_block.c();
    					if_block.m(main, t7);
    				}
    			} else if (if_block) {
    				if_block.d(1);
    				if_block = null;
    			}

    			if (dirty & /*news*/ 16 && safe_not_equal(previous_key_3, previous_key_3 = /*news*/ ctx[4])) {
    				key_block3.d(1);
    				key_block3 = create_key_block(ctx);
    				key_block3.c();
    				key_block3.m(section, t8);
    			} else {
    				key_block3.p(ctx, dirty);
    			}

    			const inputform_changes = {};

    			if (!updating_comments && dirty & /*comments*/ 2) {
    				updating_comments = true;
    				inputform_changes.comments = /*comments*/ ctx[1];
    				add_flush_callback(() => updating_comments = false);
    			}

    			if (!updating_tagIndex && dirty & /*tagCount*/ 1) {
    				updating_tagIndex = true;
    				inputform_changes.tagIndex = /*tagCount*/ ctx[0];
    				add_flush_callback(() => updating_tagIndex = false);
    			}

    			if (!updating_sorts && dirty & /*sorts*/ 32) {
    				updating_sorts = true;
    				inputform_changes.sorts = /*sorts*/ ctx[5];
    				add_flush_callback(() => updating_sorts = false);
    			}

    			inputform.$set(inputform_changes);

    			if (!current || dirty & /*expire*/ 8 && section_class_value !== (section_class_value = /*expire*/ ctx[3] ? "expire" : "")) {
    				attr_dev(section, "class", section_class_value);
    			}

    			if (!current || dirty & /*onload, admin*/ 384 && div_class_value !== (div_class_value = "" + ((/*onload*/ ctx[7] ? "onload" : "") + " " + (/*admin*/ ctx[8] ? 'admin' : '')))) {
    				attr_dev(div, "class", div_class_value);
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(key_block2);
    			transition_in(inputform.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(key_block2);
    			transition_out(inputform.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			key_block0.d(detaching);
    			key_block1.d(detaching);
    			key_block2.d(detaching);
    			if (if_block) if_block.d();
    			key_block3.d(detaching);
    			destroy_component(inputform);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance($$self, $$props, $$invalidate) {
    	let title;
    	let onload;
    	let admin;
    	let news;
    	let sorts;
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('App', slots, []);
    	let mode = "basic";
    	let tagCount = 0;
    	let adminCount = 0;
    	let comments, filter, tags, expire;
    	let newsComment;

    	COMMENTS.subscribe(arr => {
    		$$invalidate(1, comments = arr.map(el => {
    			el.CONTENTS = el.CONTENTS.replace(/AND/, "&");
    			return el;
    		}));
    	});

    	TAGS.subscribe(arr => tags = arr.map(el => el.replace(/AND/, "&")));
    	SORTS.subscribe(arr => $$invalidate(5, sorts = arr));
    	FILTER.subscribe(obj => $$invalidate(2, filter = obj));
    	EXPIRE.subscribe(str => $$invalidate(3, expire = str));

    	// init
    	if (!getCookie("uuid")) setCookie("uuid", uuidv4(), 30);

    	const vh = window.innerHeight * 0.01;
    	document.documentElement.style.setProperty('--vh', `${vh}px`);

    	getComments(get_store_value(URL), data => {
    		COMMENTS.set(data.list);
    		TAGS.set(data.tag);
    		SORTS.set(data.sort);

    		FILTER.update(obj => {
    			let newObj = {};
    			newObj.TAG = data.tag[0];

    			newObj.SORT = data.sort.map(el => {
    				return el.map(innerEl => true);
    			});

    			return { ...obj, ...newObj };
    		});

    		EXPIRE.update(num => new Date(data.expire).getTime() - new Date().getTime() < 0);
    		$$invalidate(8, admin = data.admin === "Y");
    		$$invalidate(6, title = tags[tagCount]);
    		$$invalidate(7, onload = true);
    		appHeight();

    		// expireTimer();
    		setTimeout(
    			() => {
    				scrollAnimation("main ul", "main ul > li:last-child");
    			},
    			150
    		);
    	}); // reloadComments();

    	const appHeight = () => {
    		const doc = document.documentElement;
    		doc.style.setProperty('--app-height', `${window.innerHeight}px`);
    	};

    	window.addEventListener('resize', appHeight);

    	const adminCommand = delay => {
    		let timer;

    		// let count = 0;
    		return () => {
    			clearTimeout(timer);
    			adminCount += 1;

    			if (adminCount >= 10) {
    				adminCount = 0;
    				return changeAdmin();
    			}

    			timer = setTimeout(
    				() => {
    					adminCount = 0;
    				},
    				delay
    			);
    		};
    	};

    	const changeAdmin = () => {
    		$$invalidate(7, onload = false);

    		postComments(get_store_value(URL), "ADMIN=Y", () => {
    			getComments(get_store_value(URL), data => {
    				COMMENTS.set(data.list);
    				$$invalidate(8, admin = data.admin === "Y");
    				$$invalidate(7, onload = true);
    			});
    		});
    	};

    	const changeTag = () => {
    		$$invalidate(0, tagCount++, tagCount);
    		if (tagCount > tags.length - 1) $$invalidate(0, tagCount = 0);
    		FILTER.update(obj => ({ ...obj, TAG: tags[tagCount] }));
    		$$invalidate(6, title = tags[tagCount]);

    		setTimeout(
    			() => {
    				scrollAnimation("main ul", "main ul > li:last-child");
    			},
    			150
    		);
    	};

    	const commentSort = arr => {
    		if (filter.MINE) arr = arr.filter(el => el.UUID === get_store_value(UUID) || el.SORT === "?????????");
    		arr = arr.filter(el => el.TAG === tags[tagCount]);

    		return arr.filter(el => {
    			let index = sorts[tagCount].indexOf(el.SORT);
    			return index > -1 && (filter.SORT[tagCount][index] || el.SORT === "?????????");
    		});
    	};

    	const mineComment = event => {
    		FILTER.update(obj => ({ ...obj, MINE: event.target.checked }));
    	};

    	const changeFilter = (event, index) => {
    		FILTER.update(obj => {
    			obj.SORT[tagCount][index] = event.target.checked;
    			obj.UPDATE = new Date();
    			return obj;
    		});
    	};

    	const reloadComments = () => {
    		newsComment = setInterval(
    			() => {
    				getComments(get_store_value(URL), data => {
    					if (data.list.length > comments.length) $$invalidate(4, news = true);
    					COMMENTS.set(data.list);
    				});
    			},
    			60000
    		);
    	};

    	const checkNewComment = () => {
    		$$invalidate(4, news = false);
    		scrollAnimation("main ul", "main ul > li:last-child");
    	};

    	const expireTimer = () => {
    		const oneDay = 24 * 60 * 60 * 1000;

    		const ticker = () => {
    			if (get_store_value(EXPIRE) > oneDay) return;

    			// let hours = Math.floor(get(EXPIRE) / (60 * 60 * 1000));
    			// let minutes = hours
    			if (get_store_value(EXPIRE) < 0) clearInterval(timer);
    		};

    		let timer = setInterval(ticker, 1000);
    	};

    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<App> was created with unknown prop '${key}'`);
    	});

    	const change_handler = (i, event) => changeFilter(event, i);

    	function inputform_comments_binding(value) {
    		comments = value;
    		$$invalidate(1, comments);
    	}

    	function inputform_tagIndex_binding(value) {
    		tagCount = value;
    		$$invalidate(0, tagCount);
    	}

    	function inputform_sorts_binding(value) {
    		sorts = value;
    		$$invalidate(5, sorts);
    	}

    	$$self.$capture_state = () => ({
    		get: get_store_value,
    		Core,
    		URL,
    		UUID,
    		TAGS,
    		FILTER,
    		SORTS,
    		COMMENTS,
    		EXPIRE,
    		Comments,
    		InputForm,
    		mode,
    		tagCount,
    		adminCount,
    		comments,
    		filter,
    		tags,
    		expire,
    		newsComment,
    		vh,
    		appHeight,
    		adminCommand,
    		changeAdmin,
    		changeTag,
    		commentSort,
    		mineComment,
    		changeFilter,
    		reloadComments,
    		checkNewComment,
    		expireTimer,
    		news,
    		sorts,
    		title,
    		onload,
    		admin
    	});

    	$$self.$inject_state = $$props => {
    		if ('mode' in $$props) mode = $$props.mode;
    		if ('tagCount' in $$props) $$invalidate(0, tagCount = $$props.tagCount);
    		if ('adminCount' in $$props) adminCount = $$props.adminCount;
    		if ('comments' in $$props) $$invalidate(1, comments = $$props.comments);
    		if ('filter' in $$props) $$invalidate(2, filter = $$props.filter);
    		if ('tags' in $$props) tags = $$props.tags;
    		if ('expire' in $$props) $$invalidate(3, expire = $$props.expire);
    		if ('newsComment' in $$props) newsComment = $$props.newsComment;
    		if ('news' in $$props) $$invalidate(4, news = $$props.news);
    		if ('sorts' in $$props) $$invalidate(5, sorts = $$props.sorts);
    		if ('title' in $$props) $$invalidate(6, title = $$props.title);
    		if ('onload' in $$props) $$invalidate(7, onload = $$props.onload);
    		if ('admin' in $$props) $$invalidate(8, admin = $$props.admin);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	$$invalidate(6, title = "TITLE");
    	$$invalidate(7, onload = false);
    	$$invalidate(8, admin = false);
    	$$invalidate(4, news = false);
    	$$invalidate(5, sorts = []);

    	return [
    		tagCount,
    		comments,
    		filter,
    		expire,
    		news,
    		sorts,
    		title,
    		onload,
    		admin,
    		adminCommand,
    		changeTag,
    		commentSort,
    		mineComment,
    		changeFilter,
    		checkNewComment,
    		change_handler,
    		inputform_comments_binding,
    		inputform_tagIndex_binding,
    		inputform_sorts_binding
    	];
    }

    class App extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance, create_fragment, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "App",
    			options,
    			id: create_fragment.name
    		});
    	}
    }

    var app = new App({
    	target: document.body
    });

    return app;

})();
//# sourceMappingURL=bundle.js.map
