import { Subject } from "rxjs"

const DEFAULT_QUEUE_LOCK_TIMEOUT = 30_000
const DEFAULT_INIT_EMITTER_TIMEOUT = 30_000

export class QueueLock {

    private static _containers: {
        [name: string]: {
            [lockIdx: string]: QueueLock
        }
    } = {}

    public static disposeByIdx(containerName: string, idx: string) {

        const container = this._containers[containerName]

        if(!container || !container[idx]) return 

        delete container[idx]

    }

    public static initLocksContainer(name: string){

        if(this._containers[name])
            throw new Error(`Sync locks container with index "${name}" already exists!`)
        this._containers[name] = {}

        return this._containers[name]

    }

    public static disposeLocksContainer(name: string){
        delete this._containers[name]
    }

    public static getLock(container: string, index: string, timeout: number = DEFAULT_QUEUE_LOCK_TIMEOUT){

        if(!this._containers[container]) 
            throw new Error(`Sync locks container with index "${container}" does not exist!`)

        let lock = 
            this._containers[container][index] = 
            this._containers[container][index] || new QueueLock(container, timeout)

        return lock

    }

    private _locked = false 
    private _unlockDispatcher : Subject<boolean>

    constructor(
        private containerName: string,
        private timeout: number
    ){

        this._unlockDispatcher = new Subject()

    }

    public async lock() {

        if(this._locked == true)
        await new Promise((resolve, reject) => {

            let sub = this._unlockDispatcher.subscribe((finished: boolean) => {

                if(this._locked == false) {

                    this._locked = true;
                    sub.unsubscribe()
                    clearTimeout(cancel)
                    resolve(finished)

                }

            })

            let cancel = setTimeout(() => {

                sub.unsubscribe()
                this.release()
                reject(new Error('Sync operation lock timeout of '+this.timeout+'reached at "'+this.containerName+'"'))

            }, this.timeout)
            
        })
        else this._locked = true

    }

    public release() {

        this._locked = false 
        this._unlockDispatcher.next(true)

    }

}

export class InitEmitter {

    private _init : boolean
    private _initDispatcher: Subject<boolean>
    private _timeout: number

    constructor(initTimeout: number = DEFAULT_INIT_EMITTER_TIMEOUT){

        this._init = false 
        this._initDispatcher = new Subject()
        this._timeout = initTimeout

    }

    public get init() : Promise<boolean> {

        if(this._init) return new Promise(resolve => resolve(true))
        else return new Promise((resolve, reject) => {

            let sub = this._initDispatcher.subscribe((finished: boolean) => {

                sub.unsubscribe()
                clearTimeout(cancel)
                resolve(finished)

            })

            let cancel = setTimeout(() => {

                sub.unsubscribe()
                if(!this._init) reject(new Error('Timeout of '+this._timeout+' reached'))

            }, this._timeout)

        })

    }

    public ready() {

        if(this._init) return 
        this._init = true 
        this._initDispatcher.next(true)

    }

}