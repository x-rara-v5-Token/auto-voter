// Auto Vote Rating - Options Controller
// Redesigned to integrate with modern UI

const initializeFunc = initializeConfig()

const $ = s => document.querySelector(s)
const $$ = s => [...document.querySelectorAll(s)]
const esc = t => String(t || '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]))
const fmt = d => d ? new Date(d).toLocaleString('id-ID') : 'Belum ada'

let currentProjects = []

function toast(msg) {
    const t = $('#toast')
    if (!t) return
    t.textContent = msg
    t.classList.add('on')
    clearTimeout(toast._h)
    toast._h = setTimeout(() => t.classList.remove('on'), 2200)
}

const cd = ms => {
    if (ms == null || isNaN(ms)) return 'Siap vote'
    if (ms <= 0) return 'Siap vote'
    const s = Math.floor(ms / 1000)
    return [Math.floor(s / 3600), Math.floor((s % 3600) / 60), s % 60]
        .map(n => String(n).padStart(2, '0'))
        .join(':')
}

// Navigasi Section & Menu
function showSection(id) {
    if (!$('#' + id)) id = 'daftar'
    $$('section').forEach(s => s.classList.toggle('on', s.id === id))
    $$('#menu button').forEach(b => b.setAttribute('aria-selected', b.dataset.t === id))
    if (location.hash !== '#' + id) history.replaceState(null, '', '#' + id)
}

const logo = $('#logo')
const menu = $('#menu')
const setMenu = open => {
    menu.classList.toggle('open', open)
    logo.setAttribute('aria-expanded', open)
}

logo.onclick = e => {
    e.stopPropagation()
    setMenu(!menu.classList.contains('open'))
}

$$('#menu button').forEach(b => {
    b.onclick = () => {
        showSection(b.dataset.t)
        setMenu(false)
        window.scrollTo(0, 0)
    }
})

document.addEventListener('click', e => {
    if (!menu.contains(e.target) && e.target !== logo) setMenu(false)
})

window.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
        setMenu(false)
        logo.focus()
    }
})

window.addEventListener('hashchange', () => showSection(location.hash.slice(1)))

// Manajemen Log
async function addLog(msg) {
    const time = new Date().toLocaleString('id-ID')
    const entry = '[' + time + ' LOG]: ' + msg
    try {
        if (dbLogs) await dbLogs.put('logs', entry)
    } catch (e) {
        console.error(e)
    }
    drawLog()
}

async function drawLog() {
    const l = $('#log')
    if (!l || !dbLogs) return
    try {
        const logs = await dbLogs.getAll('logs')
        if (!logs || logs.length === 0) {
            l.textContent = 'Belum ada aktivitas tercatat.'
        } else {
            l.textContent = logs.slice(-200).join('\n')
            l.scrollTop = l.scrollHeight
        }
    } catch (e) {
        l.textContent = 'Gagal memuat log: ' + e.message
    }
}

// Daftar Server Terdaftar
async function loadProjects() {
    if (!db) return
    try {
        const tx = db.transaction('projects', 'readwrite')
        const store = tx.objectStore('projects')
        const projects = []
        let cursor = await store.openCursor()
        while (cursor) {
            const p = cursor.value
            let updated = false
            if (p.key !== cursor.key) {
                p.key = cursor.key
                updated = true
            }
            if (!p.ratingMain) {
                const main = allProjects[p.rating]?.URLMain?.()
                if (main && main !== p.rating) {
                    p.ratingMain = main
                    updated = true
                } else if (p.rating === 'minecraft-mp.com' || p.game === 'minecraft-mp.com') {
                    p.ratingMain = 'listforge.net'
                    updated = true
                }
            }
            if (!p.game && p.rating) {
                p.game = p.rating
                updated = true
            }
            if (!p.nick) {
                p.nick = 'bbybos'
                updated = true
            }
            if (updated) {
                await cursor.update(p)
            }
            projects.push(p)
            cursor = await cursor.continue()
        }
        await tx.done
        currentProjects = projects
    } catch (e) {
        console.error('Failed to load projects', e)
        currentProjects = []
    }
    drawServers()
}

function drawServers() {
    const rowsEl = $('#rows')
    if (!rowsEl) return

    if (!currentProjects || currentProjects.length === 0) {
        rowsEl.innerHTML = '<div class="empty">Belum ada server. Buka Tambah server untuk mulai.</div>'
        return
    }

    rowsEl.innerHTML = currentProjects.map((s, i) => {
        const host = s.game || s.rating || 'Minecraft'
        const title = s.name || s.title || (s.id ? 'Server #' + s.id : '')
        const isCaptcha = s.rating === 'minecraft-mp.com' || s.captcha
        const nick = s.nick || '-'
        const nextTime = s.time || 0
        const diff = nextTime ? nextTime - Date.now() : 0
        const whenText = nextTime ? fmt(nextTime) : 'Segera'

        return `
        <div class="tr">
            <div class="srv">
                <b>${esc(host)}</b>
                <span class="sub2">${s.id ? '#' + esc(s.id) + ' · ' : ''}${esc(title)}</span>
                ${isCaptcha ? '<span class="tag w">Pakai captcha</span>' : ''}
            </div>
            <div>${esc(nick)}</div>
            <div class="cdw">
                <span class="cd" data-i="${i}">${cd(diff)}</span>
                <span class="when">${whenText}</span>
            </div>
            <div class="ac">
                <button data-a="re" data-i="${i}" title="Jalankan vote sekarang">Ulangi</button>
                <button data-a="rm" data-i="${i}" title="Hapus server ini">Hapus</button>
            </div>
        </div>`
    }).join('')
}

$('#rows').onclick = async e => {
    const b = e.target.closest('button')
    if (!b) return
    const i = Number(b.dataset.i)
    const s = currentProjects[i]
    if (!s) return

    if (b.dataset.a === 'rm') {
        if (s.key != null) {
            try {
                chrome.runtime.sendMessage({ projectDeleted: s })
            } catch (err) {}
            await db.delete('projects', s.key)
            try {
                chrome.alarms.clear(String(s.key))
            } catch (err) {}
        }
        await addLog('Server dihapus: ' + (s.game || s.rating || s.id))
        toast('Server dihapus')
        await loadProjects()
    } else if (b.dataset.a === 're') {
        s.time = null
        if (s.key != null) {
            await db.put('projects', s, s.key)
        }
        try {
            chrome.runtime.sendMessage({ projectRestart: s, confirmed: true })
            chrome.runtime.sendMessage('checkVote')
        } catch (err) {
            console.warn(err)
        }
        await addLog((s.game || s.rating || 'Server') + ': jadwal vote diulang, sistem mulai bekerja')
        toast('Memulai proses voting...')
        await loadProjects()
    }
}

$('#clearAll').onclick = async () => {
    if (currentProjects.length && confirm('Hapus semua server?')) {
        for (const p of currentProjects) {
            if (p.key != null) {
                try {
                    chrome.runtime.sendMessage({ projectDeleted: p })
                } catch (e) {}
            }
        }
        const tx = db.transaction('projects', 'readwrite')
        await tx.store.clear()
        await tx.done
        await addLog('Semua server dihapus')
        toast('Semua server dihapus')
        await loadProjects()
    }
}

// Timer hitung mundur live
setInterval(() => {
    $$('.cd').forEach(c => {
        const i = Number(c.dataset.i)
        const s = currentProjects[i]
        if (s) {
            const diff = s.time ? s.time - Date.now() : 0
            c.textContent = cd(diff)
        }
    })
}, 1000)

// Form Tambah Server
$('#mode').onchange = e => $('#manual').classList.toggle('on', e.target.checked)

$('#add').onclick = async () => {
    const v = $('#url').value.trim()
    if (!v) {
        toast('Masukkan tautan halaman vote terlebih dahulu')
        return
    }

    let parsedUrl
    try {
        parsedUrl = new URL(v)
    } catch (e) {
        toast('Tautan tidak valid. Awali dengan https://')
        return
    }

    let domain = parsedUrl.hostname.replace(/^www\./, '')
    if (typeof getDomainWithoutSubdomain === 'function') {
        try {
            domain = getDomainWithoutSubdomain(v) || domain
        } catch (e) {}
    }

    const funcRating = typeof allProjects !== 'undefined' ? allProjects[domain] : null
    let project = {}
    if (funcRating && typeof funcRating.parseURL === 'function') {
        try {
            project = funcRating.parseURL(parsedUrl) || {}
        } catch (e) {
            project = {}
        }
    }

    project.rating = domain
    project.game = parsedUrl.hostname.replace(/^www\./, '')

    if (funcRating && typeof funcRating.URLMain === 'function') {
        const domain2 = funcRating.URLMain()
        if (domain2 && domain2 !== domain) {
            project.ratingMain = domain2
        }
    }
    if (!project.ratingMain && (domain === 'minecraft-mp.com' || project.game === 'minecraft-mp.com')) {
        project.ratingMain = 'listforge.net'
    }

    if (!project.id) {
        const match = v.match(/\/(\d{3,})/)
        if (match) project.id = match[1]
    }

    const manualName = $('#mName').value.trim()
    const manualTitle = $('#mTitle').value.trim()

    project.nick = manualName || project.nick || 'bbybos'
    project.name = manualTitle || project.name || (project.id ? 'Server #' + project.id : project.game)
    project.time = null // Siap untuk vote langsung

    project.stats = {
        successVotes: 0,
        monthSuccessVotes: 0,
        lastMonthSuccessVotes: 0,
        errorVotes: 0,
        laterVotes: 0,
        lastSuccessVote: null,
        lastAttemptVote: null,
        added: Date.now()
    }

    // Periksa apakah server sudah terdaftar
    const existing = await db.getAll('projects')
    const found = existing.find(p => p.rating === project.rating && p.id === project.id && p.nick === project.nick)
    if (found) {
        toast('Server sudah terdaftar sebelumnya!')
        return
    }

    const tx = db.transaction('projects', 'readwrite')
    const store = tx.objectStore('projects')
    const key = await store.put(project)
    project.key = key
    await store.put(project, key)
    await tx.done

    await addLog('Server ditambahkan: ' + project.game + (project.id ? ' (#' + project.id + ')' : ''))
    $('#url').value = ''
    $('#mName').value = ''
    $('#mTitle').value = ''
    toast('Server ditambahkan! Memulai vote...')
    await loadProjects()
    showSection('daftar')

    try {
        chrome.runtime.sendMessage({ projectRestart: project, confirmed: true })
        chrome.runtime.sendMessage('checkVote')
    } catch (e) {
        console.warn('Gagal memicu checkVote:', e)
    }
}

// Grup Pengaturan
const SETTINGS_GROUPS = [
    ['Notifikasi', [
        ['Nonaktifkan notifikasi mulai voting', 'disabledNotifStart'],
        ['Nonaktifkan notifikasi voting berhasil', 'disabledNotifInfo'],
        ['Nonaktifkan notifikasi peringatan', 'disabledNotifWarn'],
        ['Nonaktifkan notifikasi error', 'disabledNotifError']
    ]],
    ['Voting', [
        ['Nonaktifkan pengecekan koneksi internet', 'disabledCheckInternet'],
        ['Jangan ulangi voting otomatis jika waktu habis', 'disabledRestartOnTimeout'],
        ['Otomatis fokus ke tab voting', 'disabledFocusedTab']
    ]],
    ['Captcha', [
        ['Nonaktifkan peringatan captcha manual', 'disabledWarnCaptcha'],
        ['Jangan otomatis klik checkbox captcha', 'disabledClickCaptcha']
    ]],
    ['Lanjutan', [
        ['Mode pengguna lanjutan', 'expertMode']
    ]]
]

function renderSettings() {
    const optsEl = $('#opts')
    if (!optsEl || !settings) return
    optsEl.innerHTML = SETTINGS_GROUPS.map(g => `
        <div class="grp">
            <h3>${g[0]}</h3>
            <div class="list">
                ${g[1].map(([label, key]) => `
                    <label>
                        <span>${label}</span>
                        <span class="sw">
                            <input type="checkbox" data-key="${key}" ${settings[key] ? 'checked' : ''}>
                            <span class="t"></span>
                        </span>
                    </label>
                `).join('')}
            </div>
        </div>
    `).join('')

    optsEl.onchange = async e => {
        const key = e.target.dataset.key
        if (key && settings) {
            settings[key] = e.target.checked
            if (chrome.storage?.local) {
                await chrome.storage.local.set({ [key]: settings[key] })
            }
            toast('Pengaturan disimpan')
        }
    }
}

// Log tombol
$('#lRef').onclick = async () => {
    await drawLog()
    toast('Log disegarkan')
}

$('#lClr').onclick = async () => {
    if (!confirm('Bersihkan semua catatan log aktivitas?')) return
    if (dbLogs) await dbLogs.clear('logs')
    await drawLog()
    toast('Log berhasil dibersihkan')
}

$('#lDl').onclick = async () => {
    if (!dbLogs) return
    const logs = await dbLogs.getAll('logs')
    const text = (logs || []).join('\n')
    const blob = new Blob([text], { type: 'text/plain;charset=UTF-8;' })
    const anchor = document.createElement('a')
    anchor.download = 'console_history.txt'
    anchor.href = URL.createObjectURL(blob)
    anchor.click()
    toast('Mengunduh log (.txt)')
}

// Statistik Dialog
async function showStats(mode) {
    let g = generalStats
    let t = todayStats
    try {
        if (db) {
            const store = db.transaction('other').store
            g = await store.get('generalStats') || g || {}
            t = await store.get('todayStats') || t || {}
        }
    } catch (e) {}

    let rows = []
    if (mode === 'all') {
        $('#dT').textContent = 'Statistik Keseluruhan'
        rows = [
            ['Total vote berhasil', g?.successVotes || 0],
            ['Berhasil bulan ini', g?.monthSuccessVotes || 0],
            ['Berhasil bulan lalu', g?.lastMonthSuccessVotes || 0],
            ['Total error', g?.errorVotes || 0],
            ['Vote berhasil terakhir', g?.lastSuccessVote ? fmt(g.lastSuccessVote) : 'Belum ada'],
            ['Percobaan vote terakhir', g?.lastAttemptVote ? fmt(g.lastAttemptVote) : 'Belum ada']
        ]
    } else {
        $('#dT').textContent = 'Statistik Hari Ini'
        rows = [
            ['Vote berhasil hari ini', t?.successVotes || 0],
            ['Error hari ini', t?.errorVotes || 0],
            ['Vote berhasil terakhir', t?.lastSuccessVote ? fmt(t.lastSuccessVote) : 'Belum ada'],
            ['Percobaan vote terakhir', t?.lastAttemptVote ? fmt(t.lastAttemptVote) : 'Belum ada']
        ]
    }

    $('#dBody').innerHTML = rows.map(([k, val]) => `
        <div>
            <dt>${k}</dt>
            <dd>${val}</dd>
        </div>
    `).join('')
    $('#dlg').showModal()
}

$$('[data-stat]').forEach(b => b.onclick = () => showStats(b.dataset.stat))
$('#dX').onclick = () => $('#dlg').close()

$('#runCheckVote')?.addEventListener('click', async () => {
    if (!currentProjects.length) {
        toast('Tambahkan server terlebih dahulu')
        return
    }
    toast('Mengecek dan menjalankan vote...')
    for (const p of currentProjects) {
        p.time = null
        if (p.key != null) await db.put('projects', p, p.key)
        try {
            chrome.runtime.sendMessage({ projectRestart: p, confirmed: true })
        } catch (e) {}
    }
    try {
        chrome.runtime.sendMessage('checkVote')
    } catch (e) {}
    await addLog('Pemeriksaan dan voting dijalankan')
    await loadProjects()
})

// Inisialisasi awal saat DOM siap
document.addEventListener('DOMContentLoaded', async () => {
    await initializeFunc

    await loadProjects()
    renderSettings()
    await drawLog()

    showSection(location.hash.slice(1) || 'daftar')
})

// Listener pesan realtime dari background service worker
chrome.runtime.onMessage.addListener((request) => {
    if (request.log) {
        drawLog()
    }
    if (request.successfully || request.later || request.errorVote || request.errorVoteNoElement) {
        loadProjects()
        drawLog()
    }
})
