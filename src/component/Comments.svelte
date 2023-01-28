<script>
  import { get } from "svelte/store";
  
  import { UUID, EDITDATA, EDIT } from '../assets/js/store';
  
  export let comments;

  let editData;
  let newsComment;

  $: news = true;

  EDITDATA.subscribe((obj) => editData = obj);

  const onChangeMode = (key) => {
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


  /* new comment check script */

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
  // 

</script>

<ul>
  {#key editData }
    {#each comments as comment, i}
      <li
        class="{comment.UUID === get(UUID) ? "author" : "blind" } {comment.KEY === get(EDITDATA).KEY ? "edit" : "" }"
        data-key="{comment.KEY}"
        data-uuid="{comment.UUID}"
      >
        <div>
          <p>{comment.SORT}</p>
          <h2>{@html comment.CONTENTS}</h2> 
          <span>{comment.TIMESTAMP}</span>
          {#if !comment.PENDING && comment.UUID === get(UUID)  }
            <button type="button" on:click={() => onChangeMode(comment.KEY)}>옵션</button>
          {/if}
        </div>
      </li>
    {/each}
  {/key}
</ul>

{#key news}
  {#if news}
    <button type="button" on:click={checkNewComment}>새로운 코멘트</button>
  {/if}
{/key}