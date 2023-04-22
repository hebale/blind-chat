<script>
  import { afterUpdate } from "svelte";
  import { get } from "svelte/store";

  import * as Core from '../assets/js/core';
  import { URL, UUID, TAGS, FILTER, SORTS, COMMENTS, EDIT, EDITDATA } from '../assets/js/store';

  export let sorts;
  export let tagIndex;
  export let comments;
  
  let editData;
  let filter;
  let editMode;

  FILTER.subscribe((obj) => filter = obj);
  EDIT.subscribe(bool => editMode = bool);
  EDITDATA.subscribe((obj) => editData = obj);
  
  $: formData = {
    TAG: null,
		SORT: '',
		CONTENTS: '',
	};

  afterUpdate(() => {
    if(
      sorts.length > 0 &&
      sorts[tagIndex].indexOf(formData.SORT) < 0
    ) {
      formData.SORT = sorts[tagIndex][0];
    };
  });

  const onClickSendComment = () => {
    if(!formData.CONTENTS) return;
    
    let comment = { 
      ...formData,
      CONTENTS: formData.CONTENTS.replace(/\n/g, "<br>"),
      TAG: filter.TAG,
      TIMESTAMP: Core.dateSet() 
    };
      
    (async () => {
      const status = await Core.postComments(get(URL), comment);
        
      if(status === 200) {
        const data = await Core.getComments(get(URL));
        
        COMMENTS.set(data.list);
        SORTS.set(data.sort);
      }
    })();

    comment.UUID = get(UUID);
    comment.PENDING = "Y";
		comments = comments.concat(comment);

    setTimeout(() => {
      Core.scrollAnimation("main ul", "main ul > li:last-child");
    }, 150);

		formData.CONTENTS = "";
	};

  const onClickEditComment = () => {
    let params = Object.assign(editData, { METHOD: "edit" });
    
    (async () => {
      const status = await Core.postComments(get(URL), params);

      if(status === 200) {
        const data = await Core.getComments(get(URL));
        
        COMMENTS.set(data.list);
        SORTS.set(data.sort); 
      }
    })();

    comments = comments.map(el => {
      if(el.KEY === editData.KEY){
        return {
          ...el,
          SORT: editData.SORT,
          CONTENTS: editData.CONTENTS.replace(/\n/g, "<br>"),
          PENDING: "Y"
        }
      }else{
        return el
      }
    });

    EDIT.set(false);
    EDITDATA.set({
      KEY: null,
      TAG: null,
      SORT: null,
      CONTENTS: null,
    });

    formData.CONTENTS = "";
  };

  const onClickDeleteComment = () => {
    let params = { METHOD: "delete", KEY: editData.KEY };

    (async () => {
      const status = await Core.postComments(get(URL), params);

      if(status === 200) {
        const data = await Core.getComments(get(URL));

        COMMENTS.set(data.list);
        SORTS.set(data.sort);
      }
    })();

    comments = comments.filter(el => el.KEY !== editData.KEY);
    EDIT.set(false);
    EDITDATA.set({
      KEY: null,
      TAG: null,
      SORT: null,
      CONTENTS: null,
    });

    formData.CONTENTS = "";
  };

  const countComments = sort => {
    return comments.filter(el => {
      return el.TAG === get(TAGS)[tagIndex] && el.SORT === sort
    }).length
  };

  const convertLineFeed = value => {
    if(editMode){
      EDITDATA.update((obj) => ({...obj, CONTETNS: value }));
    }else{
      formData.CONTENTS = value;
    }
  };
</script>

<form class="{editMode ? "edit" : ""}">
  <div>
    {#if sorts.length > 0}
      {#key sorts}
        {#each sorts[tagIndex] as sort, i}
          <label>
            {#key editData}
              {#if editData.KEY}
                <input
                  type="radio"
                  value={sort}
                  bind:group={editData.SORT}
                >
              {:else}
                <input
                  type="radio"
                  value={sort}
                  bind:group={formData.SORT}
                >
              {/if}
            {/key}
            {sort}
            {#key comments}
              <span>{countComments(sort)}</span>
            {/key}
          </label>
        {/each}
      {/key}
    {/if}
  </div>	
  <div>
    {#if editMode}
      <textarea
        rows="3"
        on:change={(event) => convertLineFeed(event.target.value)}
        bind:value={editData.CONTENTS}
      />
      <div>
        <button type="button" on:click={onClickEditComment}>수정</button>
        <button type="button" on:click={onClickDeleteComment}>삭제</button>
      </div>
    {:else}
      <textarea
        rows="3"
        on:change={(event) => convertLineFeed(event.target.value)}
        bind:value={formData.CONTENTS}
      />
      <button type="button" on:click={onClickSendComment}>전송</button>
    {/if}
  </div>
</form>