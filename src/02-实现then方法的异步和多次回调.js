/**
 * 当构造函数传入的参数是异步函数时
 * 实现 then 方法对异步的处理和多次回调的处理
 * 
 * 即 new MyPromise(async function)
 * 此时，then 方法执行时 this.state === STATE.PENDING
 * 先保存回调函数至 this.#handlers 数组，等待 this.state 发生改变时，再依次执行所有回调
 */

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
   * @param {function} onFulfiled 
   * @param {function} onRejected 
   */
  then(onFulfiled, onRejected) {
    onFulfiled = typeof onFulfiled === 'function' ? onFulfiled : (x) => x
    onRejected = typeof onRejected === 'function' ? onRejected : (x) => { throw x }

    if (this.state === STATE.FULFILED) {
      onFulfiled(this.result)
    } else if (this.state === STATE.REJECTED) {
      onRejected(this.result)
    } else if (this.state === STATE.PENDING) {
      this.#handlers.push({
        onFulfiled,
        onRejected,
      })
    }
  }
}

const p1 = new MyPromise((res, rej) => {
  setTimeout(() => {
    res('test resolve')
  }, 2000)
})

console.log(p1)

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