import { writable, readable, get } from "svelte/store";
import * as Core from './core';

if(!Core.getCookie("uuid")) Core.setCookie("uuid", Core.uuidv4(), 30);

export const UUID = writable(Core.getCookie("uuid"));
export const COMMENTS = writable([]);
export const NEWCOMMENTS = writable([]);
export const TAGS = writable([]);
export const SORTS = writable([]);
export const FILTER = writable({
  MINE: false,
  TAG: null,
});
export const EDITDATA = writable({
  KEY: null,
  TAG: null,
  SORT: null,
  CONTENTS: null,
});

// export const API = readable("https://script.google.com/macros/s/AKfycbxFNHpsjwJkuH7jiiJP_w4e4wLby7CxcXbKf6FWuUIoKMXzmoP_fMsgFCn8gdepXM0b/exec");
export const API = readable("https://script.google.com/macros/s/AKfycbz6DPGpNdoH_p85_ymUHQUNoVFk5HmGKm7KhCqpZO6aBNXTP0dQ9SPRCHRqhN01XcaPxg/exec");
export const URL = readable(`${get(API)}?UUID=${get(UUID)}`);