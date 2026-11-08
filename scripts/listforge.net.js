function updateHUD(text, type = 'info') {
    try {
        console.log('[AVR]', text)
        chrome.runtime.sendMessage({log: '[AVR ListForge] ' + text}).catch(() => {})
        let hud = document.getElementById('avr-hud-pill')
        if (!hud) {
            hud = document.createElement('div')
            hud.id = 'avr-hud-pill'
            hud.style.cssText = 'position:fixed;top:16px;right:16px;z-index:2147483647;background:rgba(15,23,42,0.95);color:#f8fafc;padding:10px 16px;border-radius:10px;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;font-size:13px;font-weight:500;box-shadow:0 8px 24px rgba(0,0,0,0.35);border:1px solid rgba(255,255,255,0.1);backdrop-filter:blur(8px);pointer-events:none;display:flex;align-items:center;gap:10px;transition:all 0.3s ease;'
            document.body.appendChild(hud)
        }
        const colors = {
            info: '#38bdf8',
            warning: '#f59e0b',
            success: '#10b981',
            error: '#f43f5e'
        }
        const dotColor = colors[type] || colors.info
        hud.innerHTML = `<span style="width:10px;height:10px;border-radius:50%;background:${dotColor};box-shadow:0 0 8px ${dotColor};display:inline-block;"></span><span><strong>AVR:</strong> ${text}</span>`
    } catch (e) {}
}

function fillForm(nick) {
    if (document.querySelector('#accept')) {
        const accept = document.querySelector('#accept')
        if (!accept.checked) {
            accept.checked = true
            accept.dispatchEvent(new Event('change', { bubbles: true }))
        }
    }
    const nickInput = document.getElementById('nickname')
    if (nickInput && nick) {
        if (nickInput.value !== nick) {
            nickInput.value = nick
            nickInput.dispatchEvent(new Event('input', { bubbles: true }))
            nickInput.dispatchEvent(new Event('change', { bubbles: true }))
        }
    }
}

async function vote(first) {
    //Пилюля от жадности
    if (document.getElementById('adblock-notice')) document.getElementById('adblock-notice').style.display = 'none'
    if (document.getElementById('adsense-notice')) document.getElementById('adsense-notice').style.display = 'none'
    if (document.getElementById('vote-loading-block')) document.getElementById('vote-loading-block').style.display = 'none'
    if (document.getElementById('blocked-notice')) document.getElementById('blocked-notice').style.display = 'none'
    if (document.getElementById('privacysettings-notice')) document.getElementById('privacysettings-notice').style.display = 'none'
    document.getElementById('vote-form-block')?.removeAttribute('style')
    document.getElementById('vote-button-block')?.removeAttribute('style')
    document.querySelector('.alert-danger a[href*="/servers/premium/"]')?.parentElement?.remove()
    document.querySelector('a[href="/servers/premium/"]')?.remove()

    for (const el of document.querySelectorAll('div.alert.alert-info')) {
        if (el.textContent.includes('server has been removed')) {
            updateHUD('Server telah dihapus dari daftar.', 'warning')
            chrome.runtime.sendMessage({message: el.textContent.trim(), ignoreReport: true, retryCoolDown: 21600000})
            return
        }
    }

    for (const el of document.querySelectorAll('strong')) {
        if (el.textContent.includes('website is made possible by displaying online advertisements')) continue

        if (el.textContent.includes('Thank you for your vote')) {
            updateHUD('Vote berhasil terkirim! Terima kasih.', 'success')
            chrome.runtime.sendMessage({successfully: true})
            return
        } else if (el.textContent.includes('Voting is disabled for few minutes')) {
            updateHUD('Voting dinonaktifkan beberapa menit oleh server.', 'warning')
            chrome.runtime.sendMessage({message: el.textContent, ignoreReport: true})
            return
        }
    }

    for (const el of document.querySelectorAll('div.alert.alert-danger')) {
        if (el.querySelector('center > strong')) continue
        if (!el.innerText) continue

        const request = {}
        request.message = el.textContent.trim()

        if (request.message.includes('need to accept our Privacy Policy')
            || request.message.includes('website is made possible by displaying online advertisements')
            || request.message.includes('have one unread message')) continue

        if (request.message.includes('already voted') || request.message.includes('have reached your daily vote limit')) {
            updateHUD('Sudah vote hari ini! Menunggu jadwal berikutnya.', 'warning')
            chrome.runtime.sendMessage({later: true})
            return
        } else if (request.message.toLowerCase().includes('steam login')) {
            if (first) {
                updateHUD('Membutuhkan login Steam...', 'info')
                chrome.runtime.sendMessage({auth: true})
                return
            }
        } else if (request.message.toLowerCase().includes('captcha')) {
            if (first) chrome.runtime.sendMessage({captcha: true})
        } else {
            if (request.message.includes('username maximum length') || request.message.toLowerCase().includes('vote time expired') || request.message.includes('API has returned an error')) {
                request.ignoreReport = true
            }
            chrome.runtime.sendMessage(request)
            return
        }
    }

    if (document.querySelector('.container h1')?.textContent?.includes('Error')) {
        const request = {}
        request.message = document.querySelector('.container h1').textContent + ' ' + document.querySelector('.container p').textContent
        if (request.message.includes('page you were looking for cannot be found') || request.message.includes('page you were looking does not exist anymore')) {
            request.ignoreReport = true
            request.retryCoolDown = 21600000
        }
        chrome.runtime.sendMessage(request)
    }

    // Иногда если сервер/проект был удалён то сайт просто переадресует на главную страницу или на список серверов никак не сообщая о об ошибке 404 или о том что сервер удалён
    if (document.querySelector('ul.pagination')) {
        const request = {}
        request.errorVoteNoElement = 'It looks like the site redirected to the main page (list of servers), most likely this server/project was deleted. If this is not the case and you think it is a error, inform the extension developer'
        request.ignoreReport = true
        chrome.runtime.sendMessage(request)
        return
    }

    //Вводим ник сразу, чтобы поле ввода было заполнено правильным ником
    const project = await getProject()
    updateHUD(`Mempersiapkan vote untuk akun: ${project?.nick || 'Unknown'}`, 'info')
    if (document.getElementById('nickname') != null) {
        if (project.nick == null || project.nick === '') {
            updateHUD('Nickname belum diatur dalam konfigurasi!', 'error')
            chrome.runtime.sendMessage({requiredNick: true})
            return
        }
        fillForm(project.nick)
    }

    //Если требуется авторизация Steam
    if (document.querySelector('form[name="steam_form"] > input[type="image"]') != null) {
        document.querySelector('form[name="steam_form"] > input[type="image"]').click()
        return
    }

    //Если нас каким-то образом выкинул на страницу описания сервера
    if (document.querySelector('a[role="button"][title="Vote"]')) {
        document.querySelector('a[role="button"][title="Vote"]').click()
        return
    }
    if (document.querySelector('a.btn[title="Vote for this server"]')) {
        document.querySelector('a.btn[title="Vote for this server"]').click()
        return
    }

    // Ждём решения Cloudflare Turnstile
    function isTurnstileDone() {
        const resp = document.querySelector('[name="cf-turnstile-response"]')
        if (resp && resp.value && resp.value.length > 5) return true
        const turnstileBox = document.querySelector('.cf-turnstile')
        if (turnstileBox) {
            if (turnstileBox.querySelector('[data-state="success"]') ||
                turnstileBox.innerText?.toLowerCase().includes('success') ||
                turnstileBox.querySelector('.ctp-success')) {
                return true
            }
        }
        if (window.solvedCaptcha) return true
        return false
    }

    const hasTurnstile = document.querySelector('.cf-turnstile') ||
                         document.querySelector('[name="cf-turnstile-response"]') ||
                         document.querySelector('iframe[src*="challenges.cloudflare.com"]')

    if (hasTurnstile) {
        if (!isTurnstileDone()) {
            updateHUD('Menunggu Captcha Cloudflare Turnstile diselesaikan...', 'warning')
            await new Promise(resolve => {
                let seconds = 0
                const maxSeconds = 120
                const timer = setInterval(() => {
                    seconds++
                    fillForm(project.nick)
                    if (isTurnstileDone()) {
                        clearInterval(timer)
                        updateHUD('Captcha Turnstile berhasil diverifikasi! ✔', 'success')
                        resolve()
                    } else if (seconds >= maxSeconds) {
                        clearInterval(timer)
                        updateHUD('Batas waktu captcha habis (120s), mencoba vote langsung...', 'warning')
                        resolve()
                    } else {
                        if (seconds % 2 === 0) {
                            updateHUD(`Menunggu verifikasi Captcha... (${seconds}s / ${maxSeconds}s)`, 'warning')
                        }
                    }
                }, 1000)
            })
        } else {
            updateHUD('Captcha sudah terverifikasi sebelumnya.', 'success')
        }
    }

    // Ждём решения Google reCAPTCHA
    if (document.querySelector('#vote_form div.g-recaptcha')) {
        if (!document.querySelector('#g-recaptcha-response') || !document.querySelector('#g-recaptcha-response').value) {
            updateHUD('Menunggu Google reCAPTCHA...', 'warning')
            await new Promise(resolve => {
                const timer = setInterval(() => {
                    const resp = document.querySelector('#g-recaptcha-response')
                    if (resp && resp.value && resp.value.length > 0) {
                        clearInterval(timer)
                        resolve()
                    }
                }, 1000)
            })
        }
    }

    // Ждём решения hCaptcha
    if (document.querySelector('div.h-captcha')) {
        const hCaptchaResponse = document.querySelector('[name="h-captcha-response"]')
        if (!hCaptchaResponse || !hCaptchaResponse.value || hCaptchaResponse.value.length === 0) {
            updateHUD('Menunggu hCaptcha...', 'warning')
            await new Promise(resolve => {
                const timer = setInterval(() => {
                    const resp = document.querySelector('[name="h-captcha-response"]')
                    if (resp && resp.value && resp.value.length > 0) {
                        clearInterval(timer)
                        resolve()
                    }
                }, 1000)
            })
        }
    }

    // Повторно гарантируем ник и чекбокс перед отправкой
    fillForm(project.nick)
    await new Promise(r => setTimeout(r, 600))

    // Кликаем проголосовать
    updateHUD('Menekan tombol Vote...', 'info')
    const voteBtn = document.getElementById('voteBtn') ||
                    document.querySelector('button[form="vote_form"]') ||
                    document.querySelector('#vote_form button[type="submit"]') ||
                    document.querySelector('#vote_form input[type="submit"]') ||
                    document.querySelector('button.btn-primary')

    const form = document.querySelector('#vote_form') ||
                 document.querySelector('form[name="vote_form"]') ||
                 (voteBtn ? voteBtn.closest('form') : null)

    if (voteBtn != null) {
        voteBtn.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true }))
        voteBtn.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, cancelable: true }))
        voteBtn.click()
        updateHUD('Tombol Vote diklik! Menunggu respon server...', 'info')

        setTimeout(() => {
            if (form) {
                try {
                    if (typeof form.requestSubmit === 'function') {
                        form.requestSubmit(voteBtn)
                    } else {
                        form.submit()
                    }
                } catch (e) {
                    try { form.submit() } catch (err) {}
                }
            }
        }, 1500)

        setTimeout(() => {
            if (window.location.href.includes('/vote/')) {
                updateHUD('Mencoba klik ulang tombol Vote...', 'warning')
                voteBtn.click()
            }
        }, 4000)
    } else if (form) {
        updateHUD('Mengirim formulir langsung...', 'info')
        form.submit()
    } else {
        updateHUD('Gagal: Tombol vote tidak ditemukan!', 'error')
        throw Error('No vote button found')
    }
}
