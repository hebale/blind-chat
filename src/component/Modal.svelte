<script>
  import { get } from "svelte/store";

  import * as Core from '../assets/js/core';
  import { URL, COMMENTS } from '../assets/js/store';

  export let state;
  export let admin;
  export let confirm;

  $: password = 'admin';
  $: loading = false;
  $: error = false;

  const checkPassword = async () => {
    loading= true;

    const status = await Core.postComments(get(URL), { PW: password });

    if(status === 200) {
      error = false;
      confirm({ flag: 'Y' })();
    } else {
      error = true;
    }
    loading= false;
  };

  const closeModal = () => {
    state = false;
  };
</script>

{#if state}
  <section class="modal">
    <div class={loading ? "loading" : ""}>
      {#if admin}
        <p>관리자 모드를<br>해제합니다.</p>
      {:else}
        <p>관리자 모드로<br>변경합니다. (admin)</p>
        <input type="password" bind:value={password} />
        {#if error}
          <span>비밀번호가 올바르지 않습니다.</span>
        {/if}
      {/if}
      <div>
        {#if admin}
          <button type="button" on:click={confirm({ flag: "N" })} >확인</button>
        {:else}
          <button type="button" on:click={checkPassword} >확인</button>
        {/if}
        <button type="button" on:click={closeModal} >취소</button>
      </div>
    </div>
  </section>
{/if}