/**
 * 提供构造函数和接受回调的 then 方法
 * 
 * 即，new MyPromise(func(resolve, reject))
 * 构造函数提供了 resolve 和 reject 2个函数作为参数给 func
 * 且，resolve 和 reject 的作用：
 * 完成状态判断和状态改变 STATE.PENDING -> STATE.FULFILED/REJECTED
 * 记录结果（传入 resolve/reject 的参数）至 this.result
 * 另，then 方法接受 成功/失败 回调，根据 this.state 进行处理
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

  /**
   * promise 的构造函数，接受一个函数 func 作为参数，可以执行异步操作
   * 并给 func 提供了 resolve 和 reject 2个函数作为参数
   * @param {function} func (reslve, reject)
   */
  constructor(func) {
    // 1. 改变 promise 的状态
    // 2. 记录结果
    const resolve = (res) => {
      if (this.state === STATE.PENDING) {
        this.state = STATE.FULFILED
        this.result = res
      }
    }
    const reject = (res) => {
      if (this.state === STATE.PENDING) {
        this.state = STATE.REJECTED
        this.result = res
      }
    }
    func(resolve, reject)
  }

  /**
   * 1. 接受回调函数
   * 2. 判断回调函数的类型，若不是函数，仅作为值向前传递
   * 3. 执行 成功/失败 回调
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
    }
  }
}

const p1 = new MyPromise((res, rej) => {
  // res('test resolve')
  rej('test reject')
})