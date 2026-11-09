let resolveProject, waitProject
if (!waitProject) waitProject = new Promise(resolve => resolveProject = resolve)

// Double load fix (for Rocket Loader)
if (!window.loaded) {
    window.loaded = true
    // noinspection JSIgnoredPromiseFromCall
    run()
}

async function run() {
    chrome.runtime.onMessage.addListener(function(request/*, sender, sendResponse*/) {
        if (request.sendProject) {
            window.proj = request.project
            if (request.vkontakte) window.vkontakte = request.vkontakte
            resolveProject()
        } else if (request.captchaPassed) {
            // noinspection JSIgnoredPromiseFromCall
            checkAll(false)
        }
    })

    if (window.portAlert) {
        window.portAlert.addEventListener('state', event => {
            chrome.runtime.sendMessage({message: event.detail.message})
        })
    }

    try {
        await checkAll(true)
    } catch (error) {
        throwError(error)
        return
    }

    // Integration with auto-captcha extensions
    const timer1 = setInterval(()=> {
        // 2 Captcha
        if (document.querySelector('.captcha-solver[data-state="solved"]')) {
            startVote(false)
            clearInterval(timer1)
        // Anti Captcha
        } else if (document.querySelector('.antigate_solver') && document.querySelector('.solved_flag')) {
            startVote(false)
            clearInterval(timer1)
        // Cap Monster Cloud
        } else if (document.querySelector('img.cm-addon-icon[src*="green"]')) {
            startVote(false)
            clearInterval(timer1)
        }
    }, 1000)
    const timer2 = setInterval(() => {
        // 2 Captcha
        if (isVisibleElement(document.querySelector('.captcha-solver[data-state="ready"]'))) {
            document.querySelector('.captcha-solver[data-state="ready"]').click()
            clearInterval(timer2)
        // Cap Monster Cloud
        } else if (isVisibleElement(document.querySelector('img.cm-addon-icon[src*="white-cogs"]'))) {
            document.querySelector('img.cm-addon-icon[src*="white-cogs"]').click()
            clearInterval(timer2)
        }
    }, 1000)
}

async function checkAll(first) {
    if (isUsedTranslator()) {
        chrome.runtime.sendMessage({usedTranslator: true, ignoreReport: true})
        return
    }

    // If on Steam authorization page
    if (document.URL.startsWith('https://steamcommunity.com/openid/login')) {
        if (document.getElementById('imageLogin')) {
            document.getElementById('imageLogin').click()
        } else {
            chrome.runtime.sendMessage({authSteam: true})
            return
        }
        const timer2 = setInterval(()=>{
            try {
                if (document.getElementById('error_display').style.display !== 'none') {
                    chrome.runtime.sendMessage({authSteam: true})
                    clearInterval(timer2)
                } else if ((document.querySelector('div.newmodal') && document.querySelector('div.newmodal').style.display !== 'none')
                    || (document.querySelector('div.login_modal.loginAuthCodeModal') && document.querySelector('div.login_modal.loginAuthCodeModal').style.display !== 'none')
                    || (document.querySelector('div.login_modal.loginTwoFactorCodeModal') && document.querySelector('div.login_modal.loginTwoFactorCodeModal').style.display !== 'none')
                    || (document.querySelector('div.login_modal.loginIPTModal') && document.querySelector('div.login_modal.loginIPTModal').style.display !== 'none')
                    || (document.querySelector('div.login_modal.loginAuthCodeModal') && document.querySelector('div.login_modal.loginAuthCodeModal').style.display !== 'none')
                    || document.querySelector('#loginForm')) {
                    chrome.runtime.sendMessage({authSteam: true})
                    clearInterval(timer2)
                }
            } catch (e) {
                chrome.runtime.sendMessage({errorVoteNoElement: e.stack + (document.body.textContent.trim().length < 500 ? ' ' + document.body.textContent.trim() : '')})
                clearInterval(timer2)
            }
        }, 1000)
        return
    }
    if (document.URL.startsWith('https://steamcommunity.com/login/home')) {
        chrome.runtime.sendMessage({authSteam: true})
        return
    }

    // If on VKontakte authorization page
    if (document.URL.match(/vk.com\/*/)) {
        // VK authorization logic

        // https://cdn.discordapp.com/attachments/1072161816693710868/1072172021473095700/image.png
        const timer7 = setInterval(() => {
            if (document.querySelector('#error .vkuiModalCardBase__container')) {
                clearInterval(timer7)
                chrome.runtime.sendMessage({errorAuthVK: document.querySelector('#error .vkuiModalCardBase__container').textContent})
            }
        }, 1000)
        if (document.querySelector('#error .vkuiModalCardBase__container')) return

        if (document.querySelector('.vkc__AuthRoot__contentIn')) {
            const timer = setInterval(()=>{
                if (document.querySelector('.vkc__AcceptPrivacyPolicy__content button[type="submit"]')) {
                    clearInterval(timer)
                    document.querySelector('.vkc__AcceptPrivacyPolicy__content button[type="submit"]').click()
                }
            }, 1000)
            return
        }
        let text
        let notAuth = false
        if (document.querySelector('div.oauth_form_access')) {
            text = document.querySelector('div.oauth_form_access').textContent.replace(document.querySelector('div.oauth_access_items').textContent, '').trim()
            notAuth = true
        } else if (document.querySelector('div.oauth_content > div')) {
            text = document.querySelector('div.oauth_content > div').textContent
            notAuth = true
        } else if (document.querySelector('#login_blocked_wrap')) {
            text = document.querySelector('#login_blocked_wrap div.header').textContent + ' ' + document.querySelector('#login_blocked_wrap div.content').textContent.trim()
        } else if (document.querySelector('div.login_blocked_panel')) {
            text = document.querySelector('div.login_blocked_panel').textContent.trim()
        } else if (document.querySelector('.profile_deleted_text')) {
            text = document.querySelector('.profile_deleted_text').textContent.trim()
            notAuth = true
        } else if (document.URL.startsWith('https://vk.com/join')) {
            text = chrome.i18n.getMessage('notRegVK')
            notAuth = true
        } else if (document.body.innerText.length < 500) {
            text = document.body.innerText
        } else {
            text = 'null'
        }
        chrome.runtime.sendMessage({errorAuthVK: text, notAuth})
        return
    } else if (document.location.search.includes('error=invalid_request&error_description=Invalid%20display%20parameter') || document.location.search.includes('error=invalid_request&error_description=Invalid+display+parameter')) {
        chrome.runtime.sendMessage({errorAuthVK: 'Most likely your VK account has been blocked. If not, notify the extension developer.'})
        return
    }

    // If on Discord authorization page
    if (document.URL.match(/discord.com\/*/)) {
        let replaced = false
        if (document.location.search.includes('%20guilds.join') || document.location.search.includes('%20guilds') || document.location.search.includes('+guilds.join') || document.location.search.includes('+guilds') || document.location.search.includes('%20email') || document.location.search.includes('+email') || !document.location.search.includes('prompt=none')) {
            let url = document.URL
            // Scope permission check
            if (!document.location.search.includes('client_id=477949690848083968')) { // discordbotlist.com
                if (document.location.search.includes('%20guilds.join')) {
                    url = url.replace('%20guilds.join', '')
                    replaced = true
                }
                if (document.location.search.includes('%20guilds')) {
                    url = url.replace('%20guilds', '')
                    replaced = true
                }
                if (document.location.search.includes('+guilds.join')) {
                    url = url.replace('+guilds.join', '')
                    replaced = true
                }
                if (document.location.search.includes('+guilds')) {
                    url = url.replace('+guilds', '')
                    replaced = true
                }
                if (document.location.search.includes('%20email')) {
                    url = url.replace('%20email', '')
                    replaced = true
                }
                if (document.location.search.includes('+email')) {
                    url = url.replace('+email', '')
                    replaced = true
                }
            }
            // Authorize automatically without prompt if permission already granted
            if (!document.location.search.includes('prompt=none')) {
                url = url.concat('&prompt=none')
                replaced = true
            }
            if (replaced) document.location.replace(url)
        }
        if (!replaced) {
            const timer4 = setTimeout(()=>{// Fallback delay
                chrome.runtime.sendMessage({discordLogIn: true})
            }, 10000)
            window.onbeforeunload = ()=> clearTimeout(timer4)
            window.onunload = ()=> clearTimeout(timer4)
        }
        return
    }

    // If Cloudflare verification is running
    if (document.querySelector('#challenge-form') || document.querySelector('#challenge-body-text')) {
        // If prompt requires clicking "Verify you are human"
        const timer5 = setInterval(()=>{
            if (document.querySelector('#cf-norobot-container input[type="button"]')) {
                clearInterval(timer5)
                document.querySelector('#cf-norobot-container input[type="button"]').click()
            } else if (document.querySelector('#challenge-stage > #ie-container > input[type="button"]')) {
                clearInterval(timer5)
                document.querySelector('#challenge-stage > #ie-container > input[type="button"]').click()
            }
        }, 1000)
        return
    }

    // If on Cloudflare verification page
    if (document.querySelector('div.main-wrapper > div.main-content')) {
    // if (document.querySelector('div.main-wrapper div.main-content #challenge-body-text') || document.querySelector('div.main-wrapper div.main-content #challenge-running') || document.querySelector('div.main-wrapper div.main-content #challenge-success')) {
        return
    }

    // If 5xx error
    if (document.querySelector('div#cf-wrapper div#cf-error-details h1') && document.querySelector('div#cf-wrapper div#cf-error-details > div > div.clearfix')) {
        const request = {}
        request.message = document.querySelector('div#cf-wrapper div#cf-error-details h1')?.innerText + ' ' + document.querySelector('div#cf-wrapper div#cf-error-details > div > div.clearfix').innerText
        request.ignoreReport = true
        chrome.runtime.sendMessage(request)
        return
    }

    // If Cloudflare access denied error
    if (document.querySelector('div#cf-wrapper #cf-error-details')) {
        const request = {}
        request.message = document.querySelector('div#cf-wrapper #cf-error-details').innerText
        request.ignoreReport = true
        chrome.runtime.sendMessage(request)
        return
    }

    if (document.querySelector('body > center > h1') && (document.querySelector('body > center:last-of-type')?.textContent.includes('cloudflare') || document.querySelector('body > center:last-of-type')?.textContent.includes('nginx'))) {
        const request = {}
        request.message = document.body.innerText
        request.ignoreReport = true
        chrome.runtime.sendMessage(request)
        return
    }

    // Bot Verification https://gyazo.com/04797d3f1ba6b9b90c48d1dd57d305a2
    if (document.querySelector('title')?.textContent?.includes('Bot Verification') || document.querySelector('#recaptchadiv')) {
        return
    }

    if (document.querySelector('body > h1') && document.querySelector('body > address')?.textContent.toLowerCase().includes('apache')) {
        const request = {}
        request.message = document.body.innerText
        request.ignoreReport = true
        chrome.runtime.sendMessage(request)
        return
    }

    // If on ReCaptcha verification page
    if (document.querySelector('body > iframe') && document.querySelector('body > iframe').src.startsWith('https://geo.captcha-delivery.com/captcha/')) {
        return
    }

    // jQuery compatibility
    for (const script of document.querySelectorAll('script')) {
        if (script.src.toLowerCase().includes('jquery')) {
            await new Promise(resolve => {
                const timer6 = setInterval(()=>{
                    for (const entry of window.performance.getEntries()) {
                        if (entry.name.toLowerCase().includes('jquery')) {
                            clearInterval(timer6)
                            resolve()
                            break
                        }
                    }
                }, 1000)
            })
            break
        }
    }

    await startVote(first)
}

async function startVote(first) {
    // Script load timing fallback
    if (typeof vote !== 'function') {
        await new Promise(resolve => {
            const timer3 = setInterval(()=> {
                if (typeof vote === 'function') {
                    clearInterval(timer3)
                    resolve()
                }
            }, 100)
        })
    }

    if (isUsedTranslator()) {
        chrome.runtime.sendMessage({usedTranslator: true, ignoreReport: true})
        return
    }

    try {
        await vote(first)
    } catch (e) {
        throwError(e)
    }
}

async function getProject() {
    await waitProject
    return window.proj
}

function throwError(error) {
    let message
    const request = {}

    let ignoreReport = false
    if (error.stack) {
        // noinspection JSUnresolvedVariable
        if (self.evalCore) {
            message = error.toString()
        } else {
            message = error.stack
            ignoreReport = true
        }
    } else {
        message = error
    }

    const siteText = document.body.innerText.trim()
    if (siteText.length === 0) {
        request.emptySite = true
    } else {
        request.errorVoteNoElement = message + (siteText.length < 300 ? ' ' + siteText : '')
        if (document.location.pathname === '/' && document.location.search === '') {
            ignoreReport = true
        }
    }

    if (isUsedTranslator()) {
        request.usedTranslator = true
        ignoreReport = true
    }

    if (ignoreReport) request.ignoreReport = true

    chrome.runtime.sendMessage(request)
}

function wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function isVisibleElement(elem) {
    if (!(elem instanceof Element)) return false
    const style = getComputedStyle(elem)
    if (style.display === 'none') {
        return false
    }
    if (style.visibility !== 'visible') {
        return false
    }
    if (style.opacity && style.opacity < 0.5) {
        return false
    }

    // Minimum element size check
    if (elem.offsetHeight < 16 || elem.offsetWidth < 16) {
        return false
    }

    if (elem.offsetWidth + elem.offsetHeight + elem.getBoundingClientRect().height +
        elem.getBoundingClientRect().width === 0) {
        return false
    }

    return true
}

function isUsedTranslator() {
    // If user used in-browser translator
    if (
        // Google
        document.querySelector('html')?.classList.contains('translated-ltr') || document.querySelector('html > body > #goog-gt-tt')
        // Edge
        || (document.querySelector('[_msttexthash]') && document.querySelector('[_msthash]'))
        // Yandex
        || (document.querySelector('[data-translated]')?.getAttribute('data-translated') === 'true' && document.querySelector('[data-translated]')?.tagName?.toLowerCase().includes('ya-tr'))) {
        return true
    }
    return false
}

// Return result to background on executeScript to avoid "Could not establish connection"
// noinspection BadExpressionStatementJS
true