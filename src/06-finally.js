/**
 * finally
 * 不关心 promise 的状态，
 * 在 promise 确定状态后，做一些额外的处理
 * 实例方法，等价于 then(onFinally, onFinally)
 * 
 * onFinally 不接受参数
 * 不会改变最终的 promise 状态
 * 2. 对于在 constructor 的func中 throw 的错误，在 constructor 使用 try catch 捕获
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
 * 处理 then 的返回值，给下一个链式调用的 then
 * - 1. x 是值，直接传递给下一个 then
 * - 2. x 是 promise，调用 x.then 根据 x 的状态直接使用 resolve/reject 改变状态
 * - 3. x 是 thenable 对象，调用 x.then
 * - 4. x === p2 即发生了重复引用，throw typeerror
 */
function handlePromise({ x, promise2, resolve, reject }) {
  if (x === promise2) {
    // 在外界可以捕获到内部抛出的错误，无需在作处理
    throw new TypeError('Chaining cycle detected for promise #<Promise>')
  }
  if (x instanceof MyPromise) {
    x.then(res => resolve(res), err => reject(err))
  } else if ((typeof x === 'object' || typeof x === 'function') && typeof x.then === 'function') {
    x.then(resolve, reject)
  } else {
    resolve(x)
  }
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

    try {
      func(resolve, reject)
    } catch (error) {
      reject(error)
    }
    
  }

  /**
   * 1. 接受回调函数
   * 2. 判断回调函数的类型，若不是函数，仅作为值向前传递
   * 3. 若状态不是 STATE.PENDING 则执行 成功/失败 回调
   * 4. （异步）若状态是 STATE.PENDING 则保存回调函数，在状态改变时，再调用
   *     同时支持多次调用：依次将回调函数记录在 this.#handlers 数组中
   * 5. 保证 then 方法中回调函数的异步调用
   * 
   * 6. 链式调用
   * 
   * @param {function} onFulfiled 
   * @param {function} onRejected 
   */
  then(onFulfiled, onRejected) {
    onFulfiled = typeof onFulfiled === 'function' ? onFulfiled : (x) => x
    onRejected = typeof onRejected === 'function' ? onRejected : (x) => { throw x }

    const p2 = new MyPromise((resolve, reject) => {
      if (this.state === STATE.FULFILED) {
        myAsyncCall(() => {
          try {
            const x = onFulfiled(this.result)
            handlePromise({ x, promise2: p2, resolve, reject })
          } catch(error) {
            reject(error)
          }
        })
      } else if (this.state === STATE.REJECTED) {
        myAsyncCall(() => {
          try {
            const x = onRejected(this.result)
            handlePromise({ x, promise2: p2, resolve, reject })
          } catch (error) {
            reject(error)
          }
        })
      } else if (this.state === STATE.PENDING) {
        this.#handlers.push({
          onFulfiled: () => {
            myAsyncCall(() => {
              try {
                const x = onFulfiled(this.result)
                handlePromise({x, promise2: p2, resolve, reject})
              } catch (error) {
                reject(error)
              }
            })
          },
          onRejected: () => {
            myAsyncCall(() => {
              try {
                const x = onRejected(this.result)
                handlePromise({x, promise2: p2, resolve, reject})
              } catch (error) {
                reject(error)
              }
            })
          },
        })
      }
    })
    
    return p2
  }

  /**
   * 可以链式调用
   * 等价于 then(undefined, onRejected)
   * @param {function} onRejected 
   */
  catch(onRejected) {
    return this.then(undefined, onRejected)
  }

  /**
   * 可以链式调用
   * 用于在状态*确定后*，进行的一些处理
   * 等价于 then(onFinally, onFinally)
   * 
   * - onFinally 不接受参数
   * - finally 不会改变 promise 的最终状态
   * @param {function} onFinally 
   */
  finally(onFinally) {
    // 传入同样的回调，因此不关心pronise的最终状态
    return this.then(onFinally, onFinally)
  }
}

const p1 = new MyPromise((res, rej) => {
  res('test finally')
}).then((res) => {
  console.log('p2-res', res)
}, (res) => {
  console.log('p2-err', res)
}).finally(() => {
  console.log('finally')
})