<script>
	import { get } from "svelte/store";

	import * as Core from './assets/js/core';
	import { URL, UUID, TAGS, FILTER, SORTS, COMMENTS, EXPIRE } from './assets/js/store';

	import Comments from './component/Comments.svelte';
	import InputForm from './component/InputForm.svelte';
	import Modal from './component/Modal.svelte';

	let mode = "basic";
	let tagCount = 0;
	let comments, filter, tags, expire;

	$: title = "TITLE";
	$: onload = false;
	$: modal = false;
	$: admin = false;
	$: news = false;
	$: sorts = []; 

	COMMENTS.subscribe((arr) => {
		comments = arr.map(el => {
			el.CONTENTS = el.CONTENTS.replace(/AND/, "&");
			return el;
		});
	});
	TAGS.subscribe((arr) => tags = arr.map(el => el.replace(/AND/, "&")));
	SORTS.subscribe((arr) => sorts = arr);
	FILTER.subscribe((obj) => filter = obj);
	EXPIRE.subscribe((str) => expire = str);

	// init
	if(!Core.getCookie("uuid")) Core.setCookie("uuid", Core.uuidv4(), 30);

	
	const setVh = () => {
		const vh = window.innerHeight * 0.01;
		document.documentElement.style.setProperty('--vh', `${vh}px`);
	};

	window.addEventListener('resize', setVh);
	


	(async () => {
		const data = await Core.getComments(get(URL));

		COMMENTS.set(data.list);
		TAGS.set(data.tag);
		SORTS.set(data.sort);
		FILTER.update((obj) => {
			let newObj = {};
			
			newObj.TAG = data.tag[0];
			newObj.SORT = data.sort.map(el => {
				return el.map(innerEl => true)
			});

			return {...obj, ...newObj}
		});
		EXPIRE.update((num) => (new Date(data.expire).getTime() - new Date().getTime()) < 0 );

		admin = data.admin === "Y";
		title = tags[tagCount];
		onload = true;

		// appHeight();
		setVh();
		
		setTimeout(() => {
			Core.scrollAnimation("main ul", "main ul > li:last-child");
		}, 150);
	})()

	// const appHeight = () => {
  //   const doc = document.documentElement
	// 		doc.style.setProperty('--app-height', `${window.innerHeight}px`)
	// };
	
	let changeAdmin = ({ flag }) => async () => {
		modal = false;
		onload = false;

		const status = await Core.postComments(get(URL), { ADMIN: flag });

		if(status === 200) {
			const data = await Core.getComments(get(URL));

			COMMENTS.set(data.list);
			admin = data.admin === 'Y';
			onload = true;
		};
	};

	const openModal = () => { 
		modal = true;
	};

	const changeTag = () => {
		tagCount++
		if(tagCount > tags.length - 1) tagCount = 0;

		FILTER.update((obj) => ({...obj, TAG: tags[tagCount]}));
		title = tags[tagCount];

		setTimeout(() => {
			Core.scrollAnimation("main ul", "main ul > li:last-child");
		}, 150)
	};

  const commentSort = (arr) => {
		if(filter.MINE) arr = arr.filter(el => el.UUID === get(UUID) || el.SORT === "관리자");
		arr = arr.filter(el => el.TAG === tags[tagCount]);

		return arr.filter(el => {
			let index = sorts[tagCount].indexOf(el.SORT);

			return index > -1 && (filter.SORT[tagCount][index] || el.SORT === "관리자" );
		});
	};

	const mineComment = (event) => {
		FILTER.update((obj) => ({ ...obj, MINE : event.target.checked }));
	};

	const changeFilter = (event, index) => {
		FILTER.update((obj) => {
			obj.SORT[tagCount][index] = event.target.checked;
			obj.UPDATE = new Date();
			return obj;
		});
	};
</script>

<svelte:window on:resize={appHeight}/>

<div id="app" class="{onload ? "onload" : ""} {admin ? 'admin' : ''}">
	<header>
		<button type="button" class={admin && 'active'} on:click={openModal}>admin</button>
		<h1>
			<button type="button" on:click={changeTag}>{title}</button>
		</h1>
		<label>
			<input
				type="checkbox"
				on:change={mineComment}
			>
			나의 글
		</label>
		{#if sorts.length > 0}
			<nav>
				{#each sorts[tagCount] as sort, i}
					<label>
						<input
							type="checkbox"
							value={sort}
							on:change={event => changeFilter(event, i)}
							checked={filter.SORT[tagCount][i]}
						>
						{sort}
					</label>
				{/each}
			</nav>
		{/if}
	</header>
	<main>
		{#key filter}
			<Comments bind:admin={admin} comments={commentSort(comments)} />
		{/key}

		{#if expire}
			<span>의견 수집이 종료되었습니다</span>
		{:else}
			<section>
				<InputForm bind:comments={comments} bind:tagIndex={tagCount} bind:sorts={sorts} />
			</section>
		{/if}
	</main>

	<Modal bind:state={modal} bind:admin={admin} bind:confirm={changeAdmin} />
</div>
