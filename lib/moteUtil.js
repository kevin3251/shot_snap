const path = require('path')
const mchat = require('motechat')
const fs = require('fs-extra')
const configPath = path.join(process.env.HOME, '.smartscreen', 'config.json')
const logPath = path.join(process.env.HOME, '.smartscreen', 'log.out')

const template = {
    DDN: '',
    mote: {
        EiOwner: '',
        EiName: '',
        EiType: '.tv',
        EiTag: '',
        EiLoc: ''
    },

    dSIM: {
        SToken: '',
        EiToken: '',
        WIP: '',
        LIP: ''
    },

    config: {
        AppName: 'smartscreen',
        AppKey: '1u6WauSf',
        //DCenter: 'dc@127.0.0.1:6780',
        DCenter: 'dc@202.153.173.253:6780',
        IOC: '',
        UseWeb: '',
        WebPort: '',
        WebEntry: ''
    }
}

const isOpen = (config) => {
    return new Promise(resolve => {
        mchat.Open(config, result => resolve(result.ErrCode == 0))
    })
}

const isReg = (dSIM) => {
    return new Promise(resolve => {
        mchat.Reg(dSIM, result => resolve(result))
    })
}

const updateDevice = (result, dSIM) => {
    if (dSIM.SToken != result.SToken || dSIM.EiToken != result.EiToken) {
        dSIM.SToken = result.SToken
        dSIM.EiToken = result.EiToken
    }
}

const updateEiInfo = (customInfo, settings) => {

    return new Promise(resolve => {
        let { dSIM, mote } = settings
        if (customInfo.EiName == mote.EiName && customInfo.EiType == mote.EiType && customInfo.EiTag == mote.EiTag) return

        settings.DDN = customInfo.DDN
        mchat.Set({
            SToken: dSIM.SToken,
            EdgeInfo: {
                DDN: customInfo.DDN,
                EiOwner: mote.EiOwner,
                EiName: mote.EiName,
                EiType: mote.EiType,
                EiTag: mote.Tag,
                EiLoc: mote.EiLoc
            }
        }, reply => {
            fs.outputJson(configPath, settings, err => fs.appendFile(logPath, err))
            resolve()
        })
    })
}

let settings = {}

module.exports = {
    async setup() {
        fs.outputJSONSync(configPath, template)
        settings = fs.readJsonSync(configPath)
        if (!await isOpen(settings.config)) {
            throw new Error('motechat open fail ...\n')
        }

        let regData = await isReg(settings.dSIM)
        if (regData.ErrCode != 0) {
            throw new Error('motechat reg fail...\n')
        }

        updateDevice(regData.result, settings.dSIM)
        updateEiInfo(regData.result, settings).then(() => {
            console.log(settings)
        })

        mchat.OnEvent('message', (ch, head, from, to, msgtype, data, cb) => {
            cb({ ErrCode: 0, ErrMsg: 'OK' })
        })

    },

    async loadService(service) {
        console.log('publish service')
        mchat.Isolated(service, result => console.log(result))
    },

    getDDN() {
        return settings.DDN
    },


    // for testing
    call() {
        let service = {
            SToken: settings.dSIM.SToken,
            Target: settings.DDN,
            Func: 'shot',
            Data: {},
            SendTimeout: 6,
            WaitReply: 40
        }

        mchat.Call(service, reply => console.log(reply.Reply.buffer))
    }
}
