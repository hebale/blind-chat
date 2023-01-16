<script>
  import { get } from "svelte/store";
  
  import { UUID, EDITDATA } from '../assets/js/store';
  
  export let comments;

  let editData;

  EDITDATA.subscribe((obj) => editData = obj);

  const changeMode = (key) => {
    const selected = comments.filter(el => el.KEY === key)[0];

    if(get(EDITDATA).KEY === key){
      EDITDATA.update((obj) => ({
        KEY: null,
        SORT: null,
        CONTENTS: null,
      }));
    }else{
      EDITDATA.update((obj) => ({
        KEY: selected.KEY,
        SORT: selected.SORT,
        CONTENTS: selected.CONTENTS,
      }));
    }
  };
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
          <h2>{comment.CONTENTS}</h2> 
          <span>{comment.TIMESTAMP}</span>
          {#if !comment.PENDING && comment.UUID === get(UUID)  }
            <button type="button" on:click={() => changeMode(comment.KEY)}>옵션</button>
          {/if}
        </div>
      </li>
    {/each}
  {/key}
</ul>