// vue2中异步调用函数的方式
// 依次尝试 promise.then queueMicrotask MutationObserver setTimeout

// 在手写 promise 中依次尝试 queueMicrotask MutationObserver setTimeout

/**
 * 异步执行传入的函数 func
 * 依次尝试 queueMicrotask MutationObserver setTimeout
 * @param {function} func 
 */
function myAsyncCall(func) {
  if (typeof queueMicrotask === 'function') {
    queueMicrotask(() => func())
  } else if (typeof MutationObserver === 'function') {
    // 监听一个 dom 元素，当 dom 元素发生变化时执行
    const obs = new MutationObserver(() => func())
    const spanDom = document.createElement('span')
    obs.observe(spanDom, { childList: true })

    spanDom.innerText = '123'
  } else {
    setTimeout(() => {
      func()
    }, 0)
  }
}