<script>
  import { get } from "svelte/store";
  
  import { UUID, EDITDATA, EDIT } from '../assets/js/store';
  
  export let comments;

  let editData;

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