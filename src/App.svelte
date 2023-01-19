<script>
	import { get } from "svelte/store";

	import * as Core from './assets/js/core';
	import { URL, UUID, TAGS, FILTER, SORTS, COMMENTS } from './assets/js/store';

	import Comments from './component/Comments.svelte';
	import InputForm from './component/InputForm.svelte';

	let mode = "basic";
	let tagCount = 0;
	let adminCount = 0;
	let comments, filter, tags;	
	let newsComment;

	$: title = "TITLE";
	$: onload = false;
	$: admin = false;
	$: news = false;
	$: sorts = [];

	COMMENTS.subscribe((arr) => comments = arr);
	TAGS.subscribe((arr) => tags = arr.map(el => el.replace("AND", "&")));
	SORTS.subscribe((arr) => sorts = arr);
	FILTER.subscribe((obj) => filter = obj);

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

		admin = data.admin === "Y";
		title = tags[tagCount];
		onload = true;

		appHeight();
		
		setTimeout(() => {
			Core.scrollAnimation("main ul", "main ul > li:last-child");
		}, 300)
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
	};

  const commentSort = (arr) => {
		if(filter.MINE) arr = arr.filter(el => el.UUID === get(UUID));
		arr = arr.filter(el => el.TAG === tags[tagCount]);

		return arr.filter(el => {
			let index = sorts[tagCount].indexOf(el.SORT);

			return index > -1 && filter.SORT[tagCount][index];
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
		{/key}
	</header>
	<main>
		{#key filter}
			<Comments comments={commentSort(comments)} />
		{/key}

		<section>
			{#key news}
				{#if news}
					<button type="button" on:click={checkNewComment}>새로운 코멘트</button>
				{/if}
			{/key}
			<InputForm bind:comments={comments} bind:tagCount={tagCount} bind:sorts={sorts} />
		</section>
	</main>
</div>
