export function uuidv4() {
  return ([1e7]+-1e3+-4e3+-8e3+-1e11).replace(/[018]/g, c =>
    (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16)
  );
};

export function scrollAnimation(container, target) {
  if(!document.querySelector(target)) return;
  
  document.querySelector(container).scrollTo({
    top: document.querySelector(target).offsetTop + 200,
    behavior: "smooth"
  })
};

export function getCookie(cookieName) {
  let value = document.cookie.match('(^|;) ?' + cookieName + '=([^;]*)(;|$)');
  return value ? unescape(value[2]) : null;
};

export function setCookie(cookieName, value, expire) {
  let date = new Date();
  date.setTime(date.getTime() + expire * 24 * 60 * 60 * 1000);
  document.cookie = `${cookieName}=${escape(value)};expires=${date.toUTCString()};path=/`;
};

export function getComments(url, callback) {
  fetch(url, { method: "GET" })
    .then((response) => response.json())
    .then((data) => {
      if(callback && typeof callback === "function") callback(data)
    });
};

export function postComments(url, queries, callback) {
  fetch(url + `&${queries}`, { method: "POST"})
  .then((response) => {
    if(response.status === 200) callback(response);
  });
};

export function dateSet(dataString){
  let date = dataString ? new Date(dataString) : new Date();
  let utc = date.getTime() + (date.getTimezoneOffset() * 60 * 1000);
  let koDate = new Date(utc + 32400000);

  let year = String(koDate.getFullYear()),
      month = String(koDate.getMonth()+1).length === 1 ? "0"+String(koDate.getMonth()+1) : String(koDate.getMonth()+1),
      days = String(koDate.getDate()).length === 1 ? "0"+String(koDate.getDate()) : String(koDate.getDate()),
      hours = String(koDate.getHours()).length === 1 ? "0"+String(koDate.getHours()) : String(koDate.getHours()),
      minutes = String(koDate.getMinutes()).length === 1 ? "0"+String(koDate.getMinutes()) : String(koDate.getMinutes()),
      seconds = String(koDate.getSeconds()).length === 1 ? "0"+String(koDate.getSeconds()) : String(koDate.getSeconds());

  // return year+"-"+month+"-"+days+" "+hours+":"+minutes+":"+seconds;
  return `${year.substring(2)}.${month}.${days} ${hours}:${minutes}`
}