/**
 * any
 * 静态方法
 * 获取第一个成功的 promise 或返回所有失败的原因数组
 * 返回一个 promise
 * 
 * - 若所有的 promise 都是失败状态，将所有失败的原因放入数组，resolve([...errs])
 * - 返回第一个成功的 promise resolve()
 * - 空数组直接返回，reject([])
 * - 若传入的不是可迭代对象，typeError
 * 
 * 1. 返回一个 promise
 * 2. 传入 不可迭代对象 的 typeError
 * 3. 处理空数组
 * 4. 处理全部 promise 兑现的情况
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
  // 2.3.1 如果p2和x引用同一个对象，通过TypeError作为原因拒绝promise
  if (x === promise2) {
    // 在外界可以捕获到内部抛出的错误，无需在作处理
    throw new TypeError('Chaining cycle detected for promise #<Promise>')
  }
  /**
   * 2.3.2 如果x是一个promise，采用x的状态
   * - 2.3.2.1 如果x是pending状态，promise保持等待，知道x变为fulfiled/rejected
   * - 2.3.2.2 如果x是fulfiled，用相同的原因resolve
   * - 2.3.2.3 如果x是rejected，用相同的原因reject
   */
  if (x instanceof MyPromise) {
    x.then(y => handlePromise({ promise2, x: y, resolve, reject }), err => reject(err))
  }
  // 2.3.3 如果x是一个对象或函数
  else if (x !== null && (typeof x === 'object' || typeof x === 'function')) {
    // 2.3.3.1 把 x.then 赋值给 then
    let then = undefined
    try {
      then = x.then
    } catch (error) {
      // 2.3.3.2 如果获取 then 方法时出现异常，用异常作为原因拒绝promise
      return reject(error)
    }

    // 2.3.3.3 如果 then 是一个函数，then.call(x, resolvePromise, rejectPromise)
    if (typeof then === 'function') {
      // 2.3.3.3.1 resolvePromise被参数 y 回调时，使用 y 作为原因 resolve(y)
      // 2.3.3.3.2 rejectPromise被参数 err 回调时，使用 err 作为原因 reject(err)
      // 2.3.3.3.3 如果 resolvePromise 和 rejectPromise 都被调用，或者调用多次，只处理第一次调用，其余忽略
      let called = false
      try {
        then.call(
          x,
          (y) => {
            if (called) return
            called = true
            handlePromise({ x: y, promise2, resolve, reject })
          },
          (err) => {
            if (called) return
            called = true
            reject(err)
          }
        )
      }
      catch (error) {
        // 2.3.3.3.4 调用 then 抛出错误时
        // 2.3.3.3.4.1 如果 resolvePromise 或 rejectPromise 已经被调用，忽略错误
        // 2.3.3.3.4.2 否则将抛出的错误作为拒绝的原因 reject(error)
        if (called) return

        // 注意，此时也属于调用了 rejectPromise
        called = true
        reject(error)
      }
    } else {
      // 2.3.3.4 如果 x.then 不是函数，将x作为原因 resolve(x)
      return resolve(x)
    }
  } else {
    // 2.3.4 如果 x 不是对象或函数，将x作为原因 resolve(x)
    return resolve(x)
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
          onFulfiled: (res) => {
            myAsyncCall(() => {
              try {
                const x = onFulfiled(res)
                handlePromise({x, p2, resolve, reject})
              } catch (error) {
                reject(error)
              }
            })
          },
          onRejected: (res) => {
            myAsyncCall(() => {
              try {
                const x = onRejected(res)
                handlePromise({x, p2, resolve, reject})
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
   * 用于在状态**确定后**，进行的一些处理
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

  /**
   * 静态方法
   * 返回一个 **成功状态** 的 promise ，传入的参数作为 resolve 的参数
   * - 传入 promise 实例会直接返回
   * - 传入 值 作为 resolve 的参数
   * - 传入 thenable 对象，执行其 then 方法；无 then 则按值处理
   * @param {*} value 
   * @returns MyPromise
   */
  static resolve(value) {
    if (value instanceof MyPromise) {
      return value
    } else  {
      return new MyPromise((resolve, reject) => {
        if ((typeof value === 'object' || typeof value === 'function') 
        && typeof value.then === 'function') {
          value.then(resolve, reject)
        } else {
          resolve(value)
        }
      })
    }
  }

  /**
   * 静态方法
   * 直接返回一个 **拒绝状态** 的promise 传入的值为拒绝的原因
   * @param {*} value 
   * @returns 
   */
  static reject(value) {
    return new MyPromise((undefined, reject) => {
      reject(value)
    })
  }

  /**
   * 静态方法
   * 返回数组中第一个 **状态确定** 的 promise
   * 
   * 传入的数组中元素，可以是 值， 此时按 MyPromise.resolve(value) 处理
   * @param {iterable} promises 
   * @returns 
   */
  static race(promises) {
    return new MyPromise((resolve, reject) => {
      if (!Array.isArray(promises)) {
        return reject(new TypeError('undefined is not iterable (cannot read property Symbol(Symbol.iterator))'))
      }
      promises.forEach(p => {
        MyPromise.resolve(p).then((res) => resolve(p), (rej) => reject(p))
      })
    })
  }

  /**
   * 静态方法
   * 等待传入 **可迭代对象** 中的 promise 全部执行，将结果记录在数组中返回
   * 
   * 返回一个 promise
   * 
   * - 返回与传入 promise 相同顺序的结果数组 resolve([...])
   * - 若有错误，直接返回 reject 参数为第一个出现的错误
   * - 空数组直接返回，resolve([])
   * @param {iterable} promises 
   * @returns {MyPromise}
   */
  static all(promises) {
    // 1. 返回一个 promise
    return new MyPromise((resolve, reject) => {
      // 2. 传入 不可迭代对象 的 typeError
      if (!Array.isArray(promises)) {
        return reject(new TypeError('undefined is not iterable (cannot read property Symbol(Symbol.iterator))'))
      }
      // 3. 处理空数组
      let len = promises.length
      if (len === 0) {
        return resolve([])
      }

      const results = new Array(len)
      let cnt = 0
      // 4. 处理全部 resolve 的情况
      // 5. 处理有 reject 的情况
      promises.forEach((p, index) => {
        MyPromise.resolve(p).then((res) => {
          results[index] = res
          cnt ++
          if (cnt === len) {
            resolve(results)
          }
        }, (rej) => {
          reject(rej)
        })
      })
    })
  }

  /**
   * 静态方法
   * 等待传入的 promise 数组状态全部确定后
   * 返回一个 promise
   * 
   * - 返回与传入 promise 相同顺序的结果数组，不论成功失败，都将结果放入数组，resolve([...])
   * - 空数组直接返回，resolve([])
   * - 若传入的不是可迭代对象，typeError
   * @param {iterable} promises 
   * @returns {MyPromise}
   */
  static allSettled(promises) {
    return new MyPromise((resolve, reject) => {
      if (!Array.isArray(promises)) {
        return reject(new TypeError(''))
      }

      let len = promises.length
      if (len === 0) {
        return reject(new TypeError('undefined is not iterable (cannot read property Symbol(Symbol.iterator))'))
      }

      let cnt = 0
      const results = new Array(len)
      promises.forEach((p, index) => {
        MyPromise.resolve(p).then((res) => {
          results[index] = res
          cnt ++
          if (cnt === len) {
            resolve(results)
          }
        }, (rej) => {
          results[index] = rej
          cnt ++
          if (cnt === len) {
            resolve(results)
          }
        })
      })
    })
  }

  /**
   * 静态方法
   * 获取第一个成功的 promise 或返回所有失败的原因数组
   * 返回一个 promise
   * 
   * - 若所有的 promise 都是失败状态，将所有失败的原因放入数组，resolve([...errs])
   * - 返回第一个成功的 promise resolve()
   * - 空数组直接返回，reject([])
   * - 若传入的不是可迭代对象，typeError
   * @param {iterable} promises 
   * @returns {MyPromise}
   */
  static any(promises) {
    return new MyPromise((resolve, reject) => {
      if (!Array.isArray(promises)) {
        return reject(new TypeError('undefined is not iterable (cannot read property Symbol(Symbol.iterator))'))
      }
      
      let len = promises.length

      if (len === 0) {
        return reject(new AggregateError([], 'All promises were rejected'))
      }

      let cnt = 0
      const results = new Array(len)
      promises.forEach((p, index) => {
        MyPromise.resolve(p).then((res) => {
          resolve(res)
        }, (rej) => {
          results[index] = rej
          cnt ++
          if (cnt === len) {
            reject(new AggregateError(results, 'All promises were rejected'))
          }
        })
      })
    })
  }
}

MyPromise.race()

const p1 = new MyPromise((resolve, reject) => {
  setTimeout(() => {
    resolve('resolve after 1000ms')
  }, 1000)
})

const p2 = new MyPromise((resolve, reject) => {
  setTimeout(() => {
    resolve('resolve after 2000ms')
  }, 2000)
})

const p3 = new MyPromise((resolve, reject) => {
  setTimeout(() => {
    reject('reject after 500ms')
  }, 500)
})

MyPromise.any([p1, p2, p3]).then((res) => {
  console.log('res', res)
}, (rej) => {
  console.log('rej', rej)
})

// 用于测试
module.exports = {
  deferred() {
    const res = {}
    res.promise = new MyPromise((resolve, reject) => {
      res.resolve = resolve
      res.reject = reject
    })
    return res
  }
}