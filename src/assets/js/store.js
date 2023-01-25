import { writable, readable, derived, get } from "svelte/store";
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
export const EDIT = writable(false);
export const EDITDATA = writable({
  KEY: null,
  TAG: null,
  SORT: null,
  CONTENTS: null,
});
export const EXPIRE = writable(false);

// export const API = readable("https://script.google.com/macros/s/AKfycbxFNHpsjwJkuH7jiiJP_w4e4wLby7CxcXbKf6FWuUIoKMXzmoP_fMsgFCn8gdepXM0b/exec");
export const API = readable("https://script.google.com/macros/s/AKfycbyf0rc9sJahK3K3LkopFxL6aiGqVQ9c5mh_joYGe9i5-BtmOdpICz6NkElb2OUYn_4gMQ/exec");
export const URL = readable(`${get(API)}?UUID=${get(UUID)}`);