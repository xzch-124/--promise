/**
 * 加入异步执行后
 * 保证回调函数的异步执行
 * 
 * 即，保证 then 方法中的回调函数异步执行
 * 对于 STATE.PENDING 状态下，直接将回调函数作为 异步函数 加入数组记录
 */

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

const STATE = {
  PENDING: 'pending',
  FULFILED: 'fulfiled',
  REJECTED: 'rejected',
}
/**
 * 1. promise的构造函数实际上接受一个函数 func 作为参数
 *    并提供了 resolve 和 reject 2个函数作为参数给 func
 * 2. 在 resolve 和 reject 中改变 promise 的状态，和记录状态改变的原因
 * 3. 使用 then 方法，接受成功和失败状态的回调函数
 */
class MyPromise {
  state = STATE.PENDING
  result = undefined
  #handlers = []

  /**
   * promise 的构造函数，接受一个函数 func 作为参数，可以执行异步操作
   * 并给 func 提供了 resolve 和 reject 2个函数作为参数
   * @param {function} func (reslve, reject)
   */
  constructor(func) {
    // 1. 改变 promise 的状态
    // 2. 记录结果
    // 3. 异步执行时，在改变状态后执行所有的回调函数
    const resolve = (res) => {
      if (this.state === STATE.PENDING) {
        this.state = STATE.FULFILED
        this.result = res
        this.#handlers.forEach(({ onFulfiled }) => {
          onFulfiled(this.result)
        })
      }
    }
    const reject = (res) => {
      if (this.state === STATE.PENDING) {
        this.state = STATE.REJECTED
        this.result = res
        this.#handlers.forEach(({ onRejected }) => {
          onRejected(this.result)
        })
      }
    }
    func(resolve, reject)
  }

  /**
   * 1. 接受回调函数
   * 2. 判断回调函数的类型，若不是函数，仅作为值向前传递
   * 3. 若状态不是 STATE.PENDING 则执行 成功/失败 回调
   * 4. （异步）若状态是 STATE.PENDING 则保存回调函数，在状态改变时，再调用
   *     同时支持多次调用：依次将回调函数记录在 this.#handlers 数组中
   * 5. 保证 then 方法中回调函数的异步调用
   * @param {function} onFulfiled 
   * @param {function} onRejected 
   */
  then(onFulfiled, onRejected) {
    onFulfiled = typeof onFulfiled === 'function' ? onFulfiled : (x) => x
    onRejected = typeof onRejected === 'function' ? onRejected : (x) => { throw x }

    if (this.state === STATE.FULFILED) {
      myAsyncCall(() => {
        onFulfiled(this.result)
      })
    } else if (this.state === STATE.REJECTED) {
      myAsyncCall(() => {
        onRejected(this.result)
      })
    } else if (this.state === STATE.PENDING) {
      this.#handlers.push({
        onFulfiled: (res) => myAsyncCall(() => onFulfiled(res)),
        onRejected: (res) => myAsyncCall(() => onRejected(res)),
      })
    }
  }
}

console.log('begin')

const p1 = new MyPromise((res, rej) => {
  myAsyncCall(() => rej('test async then'))
})

console.log(p1)

console.log('end')

p1.then((res) => {
  console.log('then1 onFulfiled', res)
}, (res) => {
  console.log('then1 onRejected', res)
})

p1.then((res) => {
  console.log('then2 onFulfiled', res)
}, (res) => {
  console.log('then2 onRejected', res)
})