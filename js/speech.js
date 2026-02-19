/**
 * speech.js — Web Speech API voice recognition module
 * Wraps SpeechRecognition with callbacks for result and state changes.
 */

const SpeechModule = (() => {
  // Detect browser support
  const SpeechRecognition =
    window.SpeechRecognition || window.webkitSpeechRecognition || null;

  let recognition = null;
  let _onResult = null;
  let _onStart = null;
  let _onStop = null;
  let _onError = null;
  let isListening = false;

  /**
   * Returns true if the browser supports the Web Speech API.
   * @returns {boolean}
   */
  function isSupported() {
    return SpeechRecognition !== null;
  }

  /**
   * Initialise (or re-use) the recognition instance and register callbacks.
   * @param {object} callbacks
   * @param {function} callbacks.onResult   - Called with the recognised string.
   * @param {function} [callbacks.onStart]  - Called when listening begins.
   * @param {function} [callbacks.onStop]   - Called when listening ends.
   * @param {function} [callbacks.onError]  - Called with an error message string.
   */
  function init({ onResult, onStart, onStop, onError } = {}) {
    if (!isSupported()) return;

    _onResult = onResult || null;
    _onStart = onStart || null;
    _onStop = onStop || null;
    _onError = onError || null;

    recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    recognition.onstart = () => {
      isListening = true;
      if (_onStart) _onStart();
    };

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript.trim();
      if (_onResult && transcript) _onResult(transcript);
    };

    recognition.onerror = (event) => {
      isListening = false;
      if (_onStop) _onStop();
      // Ignore no-speech errors silently; surface others.
      if (event.error !== 'no-speech' && _onError) {
        _onError(`Speech recognition error: ${event.error}`);
      }
    };

    recognition.onend = () => {
      isListening = false;
      if (_onStop) _onStop();
    };
  }

  /**
   * Start listening.  Reinitialises first to ensure a clean state.
   * @param {object} callbacks - Same shape as init().
   */
  function start(callbacks) {
    if (!isSupported()) return;
    init(callbacks);
    try {
      recognition.start();
    } catch (e) {
      // Already started — ignore.
    }
  }

  /**
   * Stop listening.
   */
  function stop() {
    if (recognition && isListening) {
      recognition.stop();
    }
  }

  /**
   * Toggle listening on/off.
   * @param {object} callbacks
   * @returns {boolean} New listening state.
   */
  function toggle(callbacks) {
    if (isListening) {
      stop();
      return false;
    } else {
      start(callbacks);
      return true;
    }
  }

  return { isSupported, start, stop, toggle, get listening() { return isListening; } };
})();
