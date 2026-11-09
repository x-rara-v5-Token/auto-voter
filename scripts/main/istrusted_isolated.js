if (document.readyState !== 'loading') {
    // chrome.runtime.sendMessage({message: 'injectScript error: isTrusted script was injected too late, document.readyState: ' + document.readyState, ignoreReport: true})
} else {
    window.portIsTrusted = document.createElement('div')
    window.portIsTrusted.id = 'avr-it-port'
    document.documentElement.appendChild(window.portIsTrusted)
}