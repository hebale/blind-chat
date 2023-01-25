<script>
	import { get } from "svelte/store";

	import * as Core from './assets/js/core';
	import { URL, UUID, TAGS, FILTER, SORTS, COMMENTS, EXPIRE } from './assets/js/store';

	import Comments from './component/Comments.svelte';
	import InputForm from './component/InputForm.svelte';

	let mode = "basic";
	let tagCount = 0;
	let adminCount = 0;
	let comments, filter, tags, expire;	
	let newsComment;

	$: title = "TITLE";
	$: onload = false;
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

	const vh = window.innerHeight * 0.01;
  document.documentElement.style.setProperty('--vh', `${vh}px`);

	Core.getComments(get(URL), (data) => {
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

		appHeight();
		// expireTimer();
		
		setTimeout(() => {
			Core.scrollAnimation("main ul", "main ul > li:last-child");
		}, 150);
		// reloadComments();
	});

	const appHeight = () => {
    const doc = document.documentElement
			doc.style.setProperty('--app-height', `${window.innerHeight}px`)
	}
	window.addEventListener('resize', appHeight)
	
	const adminCommand = (delay) => {
		let timer;
		// let count = 0;
		
		return () => {
			clearTimeout(timer);
			adminCount += 1;
			
			if(adminCount >= 10){
				adminCount = 0;
				return changeAdmin()
			};
			timer = setTimeout(() => {
				adminCount = 0
			}, delay);
		};
	};

	const changeAdmin = () => {
		onload = false;
		Core.postComments(get(URL), "ADMIN=Y", () => {
			Core.getComments(get(URL), (data) => {
				COMMENTS.set(data.list);

				admin = data.admin === "Y";
				onload = true;
			});
		})
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

	const reloadComments = () => {
		newsComment = setInterval(() => {
			Core.getComments(get(URL), (data) => {
				if(data.list.length > comments.length) news = true;
				COMMENTS.set(data.list);
			})
		}, 60000);
	};
	
	const checkNewComment = () => {
		news = false;
		Core.scrollAnimation("main ul", "main ul > li:last-child");
	};

	const expireTimer = () => {
		const oneDay = 24 * 60 * 60 * 1000;
		const ticker = () => {
			if (get(EXPIRE) > oneDay) return;
			// let hours = Math.floor(get(EXPIRE) / (60 * 60 * 1000));
			// let minutes = hours
			if (get(EXPIRE) < 0) clearInterval(timer);
		};

		let timer = setInterval(ticker, 1000);
	};


</script>

<div id="app" class="{onload ? "onload" : ""} {admin ? 'admin' : ''}">
	<header>
		<a href="http://digitest.hankookilbo.com/others/workshop/">F5</a>
		<h1>
			<button type="button" on:click={changeTag}>{title}</button>
		</h1>
		{#key admin}
			{#if admin}
				<label>
					<input
						type="checkbox" 
						on:change={mineComment}
					>
					나의 글
				</label>
			{:else}
				<label>
					<input
						type="checkbox"
						on:click={adminCommand(250)}
						on:change={mineComment}
					>
					나의 글
				</label>
			{/if}
		{/key}
		{#key admin}
			{#if admin}
				<nav>
					{#each sorts[tagCount] as sort, i}
						{#if sort !== "관리자"}
							<label>
								<input
									type="checkbox"
									value={sort}
									on:change={event => changeFilter(event, i)}
									checked={filter.SORT[tagCount][i]}
								>
								{sort}
							</label>
						{/if}
					{/each}
					</nav>
			{/if}
		{/key}
	</header>
	<main>
		{#key filter}
			<Comments comments={commentSort(comments)} />
		{/key}

		{#if expire}
			<span>의견 수집이 종료되었습니다.</span>
		{/if}
		<section class="{expire ? "expire" : ""}" >
			{#key news}
				{#if news}
					<button type="button" on:click={checkNewComment}>새로운 코멘트</button>
				{/if}
			{/key}
			<InputForm bind:comments={comments} bind:tagIndex={tagCount} bind:sorts={sorts} />
		</section>
	</main>
</div>
