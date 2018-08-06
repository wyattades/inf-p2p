
const $info = document.createElement('div');
$info.id = 'info';
document.body.appendChild($info);

const vals = {};

export const set = (key, val) => {
  let $el = vals[key];
  if (!$el) {
    $el = document.createElement('p');
    $info.appendChild($el);
    vals[key] = $el;
  }

  if (typeof val === 'number') val = val.toFixed(2);
  $el.innerText = `${key}: ${val}`;
};
