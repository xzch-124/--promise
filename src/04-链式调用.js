/**
 * 链式调用then
 * 
 * 第二个 then 方法接受第一个 then 方法的返回值
 * 要使 then 方法可以链式调用，需要在 then 方法中返回一个 promise 实例
 * 
 * 根据 promise 中的3个if分支分别处理
 * 
 * - 处理错误 获取参数 处理返回值
 * 
 * 根据第一个 then 方法的被调用时的状态（实际上由初始化promise的状态决定）
 * new Promise((resolve, reject) => { resolve(x) })  ===> then() { this.state === STATE.FuLFILED }
 * new Promise((resolve, reject) => { reject(x) })  ===> then() { this.state === STATE.REJECTED }
 * new Promise((resolve, reject) => { asyncCall() })  ===> then() { this.state === STATE.PENDING }
 * 
 * 1. 当第一个 then 的状态是 STATE.FULFILED 时
 *    在 then 方法的 if (this.state === STATE.FULFILED) {} 处理 then 的第二次调用
 *    （第一个then状态是 STATE.FULFILED 因此使用 resolve() 将参数传递给第二个 then 方法的 onFulfiled 处理）
 *    
 * 2. 当第一个 then 的状态是 STATE.REJECTED 时
 *    在 then 方法的 if (this.state === STATE.REJECTED) {} 处理 then 的第二次调用
 *    （第一个then状态是 STATE.REJECTED 因此使用 reject() 将参数传递给第二个 then 方法的 onRejected 处理）
 *    比 1 多出一种情况：在第一个 then 方法的函数参数中直接 throw error
 *    因此需要先 try catch 将错误使用 reject 处理
 *    事实上，1中也使用了 try catch 捕获错误
 * 
 * 3. 当第一个 then 的状态是 STATE.PENDING 时
 *    在 then 方法的 if (this.state === STATE.PENDING) {} 处理 then 的第二次调用
 *    （第一个then状态是 STATE.PENDING 因此 将参数传递给第二个 then 方法的 #handlers 处理）
 * 
 * 都包含了对 then 返回值 x 的相同处理逻辑，抽取出来
 * 
 * - 1. x 是值，直接传递给下一个 then
 * - 2. x 是 promise，调用 x.then 根据 x 的状态直接使用 resolve/reject 改变状态
 * - 3. x 是 thenable 对象，调用 x.then
 * - 4. x === p2 即发生了重复引用，throw typeerror
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
    func(resolve, reject)
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
                handlePromise({x, p2, resolve, reject})
              } catch (error) {
                reject(error)
              }
            })
          },
          onRejected: () => {
            myAsyncCall(() => {
              try {
                const x = onRejected(this.result)
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
}

console.log('begin')

const p1 = new MyPromise((res, rej) => {
  res('test async then')
})

console.log(p1)

console.log('end')

// 1. 第一次调用 then 时是 STATE.FULFILED 状态
// 3种情况：1. 返回值 2. 返回 promise 3. 返回p2 重复引用 报错
const p2 = p1.then((res) => {
  return 2
  // return new MyPromise((resolve, reject) => {
  //   resolve('test resolve in then1')
  //   reject('test reject in then2')
  // })
  // return p2
})
p2.then((res) => {
  console.log('p2-res', res)
}, (res) => {
  console.log('p2-err', res)
})

// 2. 第一次调用 then 时是 STATE.REJECTED 状态
// 3种情况：1. throw 2. 返回值 3. 返回 promise 4. 返回p3 重复引用 报错
const p3 = p1.then(undefined, (res) => {
  throw new Error('test reject throw in then1')
  // return 2
  // return new MyPromise((resolve, reject) => {
  //   resolve('test resolve in then1')
  //   reject('test reject in then2')
  // })
  // return p3
})
p3.then((res) => {
  console.log('p2-res', res)
}, (res) => {
  console.log('p2-err', res)
})

// 3. 第一次调用 then 时是 STATE.PENDING 状态
// 此时对加入 #handlers 数组的回调函数作相同处理即可
const p4 = new MyPromise((resolve, reject) => {
  myAsyncCall(() => resolve('test async then'))
})
p4.then((res) => {
  console.log('p2-res', res)
}, (res) => {
  console.log('p2-err', res)
})