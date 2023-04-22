<script>
  import { get } from "svelte/store";
  
  import * as Core from '../assets/js/core';
  import { URL, UUID, EDITDATA, EDIT } from '../assets/js/store';
  
  export let comments;
  export let admin;

  let editData;
  let newsComment;

  $: news = false; // temp 

  EDITDATA.subscribe((obj) => editData = obj);

  const changeMode = (key) => {
    const selected = comments.filter(el => el.KEY === key)[0];

    if(get(EDIT)){
      EDIT.set(false);
      EDITDATA.update((obj) => ({
        KEY: null,
        SORT: null,
        CONTENTS: null,
      }));
    }else{
      EDIT.set(true);
      EDITDATA.update((obj) => ({
        KEY: selected.KEY,
        SORT: selected.SORT,
        CONTENTS: selected.CONTENTS.replace(/<br>/g, "\n"),
      }));
    }
  }; 

  const changeBlind = async (event, key) => {
    const flag = event.target.checked ? "Y" : "N";
    const status = await Core.postComments(get(URL), { KEY: key, BLIND: flag });

    if(status !== 200) {
      console.warn('not changed') 
    }
  };

  /* new comment check script */
  const reloadComments = () => {
		newsComment = setInterval( async () => {
			const data = await Core.getComments(get(URL));
      
      if(data.list.length > comments.length) news = true;
      COMMENTS.set(data.list);

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
  // 

</script>

<ul>
  {#key editData }
    {#each comments as comment, i}
      <li
        class="{comment.UUID === get(UUID) ? "author" : "other" } {comment.BLIND === "Y"? "blind" : "" } {comment.KEY === get(EDITDATA).KEY ? "edit" : "" }"
        data-key="{comment.KEY}"
        data-uuid="{comment.UUID}"
      >
        <div>
          <p>{comment.SORT}</p>
          <h2>{@html comment.CONTENTS}</h2>
          <span>{comment.TIMESTAMP}</span>
          {#if !comment.PENDING && comment.UUID === get(UUID)}
            <button type="button" on:click={() => changeMode(comment.KEY)}>옵션</button>
          {:else if comment.PENDING && comment.UUID === get(UUID)}
            <i>loading</i>
          {/if}
        </div>
  
        {#if admin}
          <label>
            <input 
              type="checkbox"
              checked={comment.BLIND === 'Y'}
              on:change={(event) => changeBlind(event, comment.KEY)}
            />
            <span>블라인드</span>
            <i></i>
          </label>
        {/if}
      </li>
    {/each}
  {/key}
</ul>

{#key news}
  {#if news}
    <button type="button" on:click={checkNewComment}>새로운 코멘트</button>
  {/if}
{/key}