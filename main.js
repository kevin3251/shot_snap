const {
    app,
    BrowserWindow,
    powerSaveBlocker,
    Notification
} = require('electron')

const mUtil = require('./lib/moteUtil')
const fs = require('fs-extra')
const path = require('path')
const logPath = path.join(process.env.HOME, '.smartscreen', 'log.out')
const shotPath = path.join(process.env.HOME, '.smartscreen', 'screenshot')
const id = powerSaveBlocker.start('prevent-display-sleep')
const notify = require('electron-main-notification')

app.commandLine.appendSwitch('enable-usermedia-screen-capturing', 'true')
app.commandLine.appendSwitch('ignore-gpu-blacklist', 'true')
app.commandLine.appendSwitch('enable-gpu-resterization', 'true')
app.commandLine.appendSwitch('enable-zero-copy', 'true')
app.commandLine.appendSwitch('disable-software-rasterizer', 'true')

let win = null
let shotInterval = null

const takeShot = () => {
    return new Promise(resolve => {
        win.webContents.capturePage(image => {
            let imagePath = path.join(shotPath, `${new Date().getTime()}.png`)
            let buf = image.toPNG()
            fs.outputFile(imagePath, buf).catch(err => {
                if (!err) fs.appendFile(logPath, err, err => console.log(err))
            })
            resolve(buf)
        })
    })
}

const createWindow = () => {
    let { width, height } = require('electron').screen.getPrimaryDisplay().workAreaSize

    if (win != null) return
    win = new BrowserWindow({
        backgroundColor: '#2e2c29',
        fullscreen: true,
        frame: false,
        webPreferences: {
            nodeIntegration: false,
        }
    })

    win.loadURL('http://smartscreen.tv/')
    win.on('closed', () => win = null)

    // shotInterval = setInterval(() => {
    //     win.webContents.capturePage(image => {
    //         let imagePath = path.join(shotPath, `${new Date().getTime()}.png`)
    //         fs.outputFile(imagePath, image.toPNG()).catch(err => {
    //             fs.appendFile(logPath, err, err => console.log(err))
    //         })
    //     })
    // }, 10000)
    //}, 10 * 60000)

    let service = {
        async shot(head, body) {
            console.log('take a shot')
            let buf = await takeShot()
            return {
                fileName: `${new Date().getTime()}.png`
                //buffer: buf
            }
        }
    }

    mUtil.setup().then(() => {
        mUtil.loadService(service)
    }).then(() => {
        setTimeout(() => {  
            notify('Application DDN notification', { body: `DDN is ${mUtil.getDDN()}`}, notify.close)
        }, 4000)
        // setTimeout(() => {
        //    let notify = new Notification({
        //        title: 'program DDN',
        //        body: mUtil.getDDN(),
        //        silent: true 
        //    })
        // }, 4000)
        // notify.on('click', notify.close)
    })
    //console.log(global)
}

app.on('ready', createWindow)

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit()
    if (shotInterval != null) clearInterval(shotInterval)
})

app.on('activate', () => {
    if (win === null) createWindow()
})
