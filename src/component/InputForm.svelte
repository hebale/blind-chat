<script>
  import { get } from "svelte/store";

  import * as Core from '../assets/js/core';
  import { URL, UUID, TAGS, FILTER, SORTS, COMMENTS, EDITDATA } from '../assets/js/store';

  export let sorts;
  export let tagCount;
  export let comments;
  
  let editData;
  let filter;

  FILTER.subscribe((obj) => filter = obj);
  EDITDATA.subscribe((obj) => editData = obj);
  
  let formData = {
    TAG: null,
		SORT: 'ETC',
		CONTENTS: '',
	};

  
  const clickSendComment = () => {
    if(!formData.CONTENTS) return;
    
    let comment = { 
      ...formData,
      CONTENTS: formData.CONTENTS.replace(/\n/g, "<br>"),
      TAG: filter.TAG,
      TIMESTAMP: Core.dateSet() };
    let queries = Object.keys(comment).map(el => `${el}=${comment[el].replace(/&/g, "AND")}`).join("&");

    console.log(queries);

    Core.postComments(get(URL), queries, () =>
      Core.getComments(get(URL), (data) => {
        COMMENTS.set(data.list);
        SORTS.set(data.sort);
      })
    );

    comment.UUID = get(UUID);
    comment.PENDING = "Y";
		comments = comments.concat(comment);

    setTimeout(() => {
      Core.scrollAnimation("main ul", "main ul > li:last-child");
    }, 150);

		formData.CONTENTS = "";
	};

  const clickEditComment = () => {
    let queries = "METHOD=edit&" + Object.keys(editData).map(el => {
      if(el === "CONTENTS"){
        return `${el}=${editData[el].replace(/\n/g, "<br>")}`;
      }else{
        return `${el}=${editData[el]}`;
      }
    }).join("&");

    console.log(queries);

    Core.postComments(get(URL), queries, () =>
      Core.getComments(get(URL), (data) => {
        COMMENTS.set(data.list);
        SORTS.set(data.sort); 
      })
    );

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
    EDITDATA.set({
      KEY: null,
      TAG: null,
      SORT: null,
      CONTENTS: null,
    });

    formData.CONTENTS = "";
  }

  const clickDeleteComment = () => {
    let queries = `METHOD=delete&KEY=${editData.KEY}`;

    Core.postComments(get(URL), queries, () =>
      Core.getComments(get(URL), (data) => {
        COMMENTS.set(data.list);
        SORTS.set(data.sort);
      })
    );

    comments = comments.filter(el => el.KEY !== editData.KEY);
    EDITDATA.set({
      KEY: null,
      TAG: null,
      SORT: null,
      CONTENTS: null,
    });

    formData.CONTENTS = "";
  }

  const countComments = sort => {
    return comments.filter(el => {
      return el.TAG === get(TAGS)[tagCount] && el.SORT === sort
    }).length
  };


  const conveter = value => {
    formData.CONTENTS = value.replace(/\n/g, "<br>");
  }
</script>

<form class="{editData.KEY ? "edit" : ""}">
  <div>
    {#if sorts.length > 0}
      {#key sorts}
        {#each sorts[tagCount] as sort, i}
          {#if sort !== "관리자"}
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
          {/if}
        {/each}
      {/key}
    {/if}
  </div>	
  <div>
    {#if editData.KEY}
      <textarea
        rows="3"
        on:change={(event) => conveter(event.target.value)}
        bind:value={editData.CONTENTS}
      />
      <div>
        <button type="button" on:click={clickEditComment}>수정</button>
        <button type="button" on:click={clickDeleteComment}>삭제</button>
      </div>
    {:else}
      <textarea
        rows="3"
        on:change={(event) => conveter(event.target.value)}
        bind:value={formData.CONTENTS}
      />
      <button type="button" on:click={clickSendComment}>전송</button>
    {/if}
  </div>
</form>