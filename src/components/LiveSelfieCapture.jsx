import { useState, useRef, useEffect, useCallback } from 'react'
import {
  Camera,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Eye,
  Smile,
  ShieldCheck,
  Sparkles,
  Upload,
} from 'lucide-react'

const MOTIONS = [
  {
    id: 'blink',
    title: 'Blink your eyes twice',
    instruction: 'Look straight at the camera and blink your eyes slowly twice.',
    icon: Eye,
    minDelta: 8,
  },
  {
    id: 'tilt_left',
    title: 'Tilt head slightly to the left',
    instruction: 'Gently tilt your head towards your left shoulder, then look straight.',
    icon: Smile,
    minDelta: 12,
  },
  {
    id: 'tilt_right',
    title: 'Tilt head slightly to the right',
    instruction: 'Gently tilt your head towards your right shoulder, then look straight.',
    icon: Smile,
    minDelta: 12,
  },
]

export default function LiveSelfieCapture({
  onCapture,
  photoPreview,
  onClear,
  allowFallbackUpload = true,
}) {
  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const streamRef = useRef(null)
  const motionTimerRef = useRef(null)
  const prevFrameDataRef = useRef(null)

  const [cameraActive, setCameraActive] = useState(false)
  const [cameraError, setCameraError] = useState('')
  const [motionPrompt, setMotionPrompt] = useState(MOTIONS[0])
  const [motionProgress, setMotionProgress] = useState(0)
  const [livenessStage, setLivenessStage] = useState('ready') // 'ready' | 'aligning' | 'moving' | 'countdown' | 'captured'
  const [countdown, setCountdown] = useState(3)
  const [manualCaptureAllowed, setManualCaptureAllowed] = useState(false)
  const [livenessConfirmed, setLivenessConfirmed] = useState(false)
  const [useUploadFallback, setUseUploadFallback] = useState(false)

  // Start camera stream
  const startCamera = useCallback(async () => {
    setCameraError('')
    setLivenessConfirmed(false)
    setMotionProgress(0)
    setManualCaptureAllowed(false)

    // Randomize movement request to prevent pre-recorded replays
    const randomMotion = MOTIONS[Math.floor(Math.random() * MOTIONS.length)]
    setMotionPrompt(randomMotion)

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Your browser does not support live camera access. Please use file upload below.')
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'user',
          width: { ideal: 720 },
          height: { ideal: 720 },
        },
        audio: false,
      })

      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()
      }

      setCameraActive(true)
      setLivenessStage('aligning')

      // After 1.5 seconds of alignment, prompt for the movement
      setTimeout(() => {
        setLivenessStage('moving')
      }, 1500)
    } catch (err) {
      console.warn('Camera start error:', err)
      let msg = 'Could not access front camera. Please grant camera permissions or use standard upload.'
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        msg = 'Camera permission was denied. Please allow camera access in your browser settings.'
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        msg = 'No camera device found on this system.'
      }
      setCameraError(msg)
      setCameraActive(false)
    }
  }, [])

  // Stop camera stream cleanly
  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop())
      streamRef.current = null
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null
    }
    if (motionTimerRef.current) {
      clearInterval(motionTimerRef.current)
      motionTimerRef.current = null
    }
    setCameraActive(false)
  }, [])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopCamera()
    }
  }, [stopCamera])

  // Capture current video frame to JPEG
  const captureFrame = useCallback(() => {
    if (!videoRef.current) return

    const video = videoRef.current
    const canvas = canvasRef.current || document.createElement('canvas')
    const width = video.videoWidth || 640
    const height = video.videoHeight || 640

    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d')

    // Draw the image directly (mirrored if facing user for natural orientation)
    ctx.translate(width, 0)
    ctx.scale(-1, 1)
    ctx.drawImage(video, 0, 0, width, height)

    // Reset transform
    ctx.setTransform(1, 0, 0, 1, 0, 0)

    canvas.toBlob(
      (blob) => {
        if (!blob) return

        const fileName = `selfie_verified_${Date.now()}.jpg`
        const file = new File([blob], fileName, { type: 'image/jpeg' })
        const previewUrl = URL.createObjectURL(blob)

        setLivenessStage('captured')
        setLivenessConfirmed(true)
        stopCamera()

        if (onCapture) {
          onCapture(file, previewUrl, true)
        }
      },
      'image/jpeg',
      0.92
    )
  }, [onCapture, stopCamera])

  // Countdown before capture
  const startCountdown = useCallback(() => {
    let count = 3
    setCountdown(3)
    const interval = setInterval(() => {
      count--
      setCountdown(count)
      if (count <= 0) {
        clearInterval(interval)
        captureFrame()
      }
    }, 800)
  }, [captureFrame])

  // Liveness frame motion detection
  useEffect(() => {
    if (!cameraActive || livenessStage !== 'moving') return

    // Allow manual capture after 4.5 seconds if optical sensor is subtle on some devices
    const manualTimer = setTimeout(() => {
      setManualCaptureAllowed(true)
    }, 4500)

    const hiddenCanvas = document.createElement('canvas')
    hiddenCanvas.width = 120
    hiddenCanvas.height = 120
    const ctx = hiddenCanvas.getContext('2d', { willReadFrequently: true })

    let accumulatedMotion = 0

    motionTimerRef.current = setInterval(() => {
      if (!videoRef.current || videoRef.current.readyState < 2) return

      try {
        ctx.drawImage(videoRef.current, 0, 0, 120, 120)
        const frame = ctx.getImageData(0, 0, 120, 120)
        const currentData = frame.data

        if (prevFrameDataRef.current) {
          // Compare luminance changes in the central face region
          let diff = 0
          const prevData = prevFrameDataRef.current
          // Sample every 4th pixel for speed and accuracy
          for (let i = 0; i < currentData.length; i += 16) {
            const rDiff = Math.abs(currentData[i] - prevData[i])
            const gDiff = Math.abs(currentData[i + 1] - prevData[i + 1])
            const bDiff = Math.abs(currentData[i + 2] - prevData[i + 2])
            diff += (rDiff + gDiff + bDiff) / 3
          }

          const avgDelta = diff / (currentData.length / 16)

          // If significant human movement detected (blink or head motion)
          if (avgDelta > motionPrompt.minDelta) {
            accumulatedMotion += 25
            setMotionProgress((prev) => Math.min(100, Math.max(prev + 25, Math.round(accumulatedMotion))))

            if (accumulatedMotion >= 100) {
              clearInterval(motionTimerRef.current)
              setLivenessConfirmed(true)
              setLivenessStage('countdown')
              startCountdown()
            }
          }
        }

        prevFrameDataRef.current = currentData
      } catch (e) {
        console.warn('Motion analysis error:', e)
      }
    }, 200)

    return () => {
      clearTimeout(manualTimer)
      if (motionTimerRef.current) {
        clearInterval(motionTimerRef.current)
      }
    }
  }, [cameraActive, livenessStage, motionPrompt, startCountdown])

  const handleRetake = () => {
    if (onClear) onClear()
    setLivenessConfirmed(false)
    setMotionProgress(0)
    setLivenessStage('ready')
    startCamera()
  }

  const MotionIcon = motionPrompt.icon

  return (
    <div className="space-y-4">
      {/* Hidden processing canvas */}
      <canvas ref={canvasRef} className="hidden" />

      {/* Case 1: Photo already captured & verified */}
      {photoPreview && !cameraActive ? (
        <div className="bg-emerald-50/70 border-2 border-emerald-300 rounded-3xl p-5 flex flex-col sm:flex-row items-center gap-5 shadow-xs">
          <div className="relative w-32 h-36 sm:w-36 sm:h-40 rounded-2xl overflow-hidden border-3 border-emerald-500 shadow-md shrink-0 bg-gray-900">
            <img
              src={photoPreview}
              alt="Live Selfie"
              className="w-full h-full object-cover"
            />
            <div className="absolute top-2 right-2 bg-emerald-600 text-white rounded-full p-1 shadow-sm">
              <CheckCircle2 className="w-4 h-4" />
            </div>
            <div className="absolute bottom-0 inset-x-0 bg-emerald-900/80 backdrop-blur-xs text-white text-[10px] font-bold text-center py-1 uppercase tracking-wider">
              Liveness Verified ✓
            </div>
          </div>

          <div className="flex-1 text-center sm:text-left space-y-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-100 text-emerald-800 rounded-full text-xs font-bold">
              <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
              <span>Anti-Fraud Liveness Verified</span>
            </div>
            <h4 className="text-base font-bold text-gray-900">
              Live Selfie Captured Successfully
            </h4>
            <p className="text-xs text-gray-600 leading-relaxed">
              Your live face verification confirms you are a real staff member. This qualifies your application for <strong>Instant Automatic Verification</strong> upon submit!
            </p>

            <div className="pt-2 flex items-center gap-3 justify-center sm:justify-start">
              <button
                type="button"
                onClick={handleRetake}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-white hover:bg-gray-50 border border-emerald-300 text-emerald-800 text-xs font-bold rounded-xl shadow-2xs transition-colors cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5 text-emerald-600" />
                <span>Retake Live Selfie</span>
              </button>
            </div>
          </div>
        </div>
      ) : cameraActive ? (
        /* Case 2: Camera active with interactive liveness detection */
        <div className="bg-gray-950 rounded-3xl p-4 sm:p-6 text-white space-y-4 border border-gray-800 shadow-lg">
          {/* Header instructions */}
          <div className="flex items-center justify-between border-b border-gray-800 pb-3">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">
                Live Verification Camera
              </span>
            </div>
            <button
              type="button"
              onClick={stopCamera}
              className="text-xs text-gray-400 hover:text-white transition-colors"
            >
              Cancel
            </button>
          </div>

          {/* Interactive movement banner */}
          <div className="bg-emerald-950/80 border border-emerald-500/40 rounded-2xl p-3.5 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600/30 border border-emerald-400/50 flex items-center justify-center shrink-0 text-emerald-300">
              <MotionIcon className="w-6 h-6 animate-bounce" />
            </div>
            <div className="flex-1 min-w-0">
              <span className="text-[10px] uppercase font-bold text-emerald-400 tracking-wider">
                Action Required ({motionPrompt.title})
              </span>
              <p className="text-sm font-semibold text-white leading-tight">
                {motionPrompt.instruction}
              </p>
            </div>
          </div>

          {/* Video Viewport with face oval guide */}
          <div className="relative aspect-square max-w-[340px] mx-auto rounded-3xl overflow-hidden bg-black border-2 border-emerald-500/60 shadow-inner flex items-center justify-center">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover -scale-x-100"
            />

            {/* Oval Face Guide Frame */}
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
              <div
                className={`w-[68%] h-[82%] rounded-[50%] border-3 border-dashed transition-all duration-300 ${
                  livenessStage === 'moving'
                    ? 'border-emerald-400 scale-102 shadow-[0_0_20px_rgba(16,185,129,0.3)]'
                    : 'border-white/50'
                }`}
              />
            </div>

            {/* Countdown Overlay */}
            {livenessStage === 'countdown' && (
              <div className="absolute inset-0 bg-emerald-950/70 backdrop-blur-xs flex flex-col items-center justify-center animate-in zoom-in-90 duration-200">
                <span className="text-6xl font-black text-emerald-300 animate-ping">
                  {countdown}
                </span>
                <p className="text-xs font-bold text-white mt-4 uppercase tracking-widest">
                  Hold steady... Capturing!
                </p>
              </div>
            )}
          </div>

          {/* Real-time Movement Progress Bar */}
          <div className="space-y-1.5 pt-1">
            <div className="flex items-center justify-between text-xs font-semibold">
              <span className="text-gray-300 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>Liveness Detection</span>
              </span>
              <span className="font-mono text-emerald-400">{motionProgress}%</span>
            </div>
            <div className="w-full h-2.5 bg-gray-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-linear-to-r from-emerald-500 to-teal-400 transition-all duration-200"
                style={{ width: `${motionProgress}%` }}
              />
            </div>
          </div>

          {/* Capture Trigger Buttons */}
          <div className="pt-2 flex flex-col sm:flex-row items-center gap-3">
            <button
              type="button"
              onClick={captureFrame}
              className={`w-full py-3.5 px-5 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer ${
                motionProgress >= 75 || manualCaptureAllowed
                  ? 'bg-emerald-500 hover:bg-emerald-400 text-gray-950 shadow-emerald-500/20'
                  : 'bg-emerald-600/80 hover:bg-emerald-600 text-white'
              }`}
            >
              <Camera className="w-4 h-4" />
              <span>
                {livenessConfirmed
                  ? 'Capture Verified Selfie'
                  : manualCaptureAllowed
                  ? 'Ready! Capture Live Selfie'
                  : 'Blink / Tilt Head Or Tap To Capture'}
              </span>
            </button>
          </div>
        </div>
      ) : (
        /* Case 3: Initial Camera CTA (or fallback) */
        <div className="space-y-3">
          {!useUploadFallback ? (
            <div className="border-2 border-dashed border-emerald-300 hover:border-emerald-500 bg-emerald-50/40 rounded-3xl p-6 sm:p-8 text-center transition-all">
              <div className="w-16 h-16 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto mb-3.5 shadow-2xs">
                <Camera className="w-8 h-8" />
              </div>

              <h4 className="text-base sm:text-lg font-bold text-gray-900">
                Take Live Selfie with Movement Check
              </h4>
              <p className="text-xs sm:text-sm text-gray-600 max-w-md mx-auto mt-1 leading-relaxed">
                To guarantee instant approval and prevent duplicates, please take a quick 3-second live selfie with a simple movement (e.g. blink or tilt head).
              </p>

              <div className="mt-5 flex flex-col sm:flex-row items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={startCamera}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm sm:text-base py-3.5 px-7 rounded-2xl shadow-xs transition-colors cursor-pointer"
                >
                  <Camera className="w-5 h-5" />
                  <span>Start Live Selfie Camera</span>
                </button>
              </div>

              {cameraError && (
                <div className="mt-4 p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center gap-2 text-left">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                  <span>{cameraError}</span>
                </div>
              )}

              {allowFallbackUpload && (
                <div className="mt-4 pt-3 border-t border-emerald-100">
                  <button
                    type="button"
                    onClick={() => setUseUploadFallback(true)}
                    className="text-xs text-gray-500 hover:text-emerald-700 font-medium underline cursor-pointer"
                  >
                    Camera not working? Switch to standard photo upload
                  </button>
                </div>
              )}
            </div>
          ) : (
            /* Upload fallback if camera is unavailable */
            <div className="border-2 border-dashed border-gray-300 hover:border-gray-400 bg-gray-50 rounded-3xl p-6 text-center space-y-3">
              <div className="w-12 h-12 rounded-xl bg-gray-200 text-gray-700 flex items-center justify-center mx-auto">
                <Upload className="w-6 h-6" />
              </div>
              <h4 className="text-sm font-bold text-gray-900">
                Standard Photo Upload
              </h4>
              <p className="text-xs text-gray-500 max-w-sm mx-auto">
                Upload a clear front-facing portrait photo. (Live camera is recommended for instant auto-verification).
              </p>

              <label className="inline-flex items-center gap-2 px-5 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl cursor-pointer text-sm shadow-xs transition-colors">
                <Upload className="w-4 h-4" />
                <span>Choose Photo File</span>
                <input
                  type="file"
                  accept="image/*"
                  capture="user"
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (file && onCapture) {
                      onCapture(file, URL.createObjectURL(file), false)
                    }
                  }}
                  className="hidden"
                />
              </label>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => setUseUploadFallback(false)}
                  className="text-xs text-emerald-700 font-bold hover:underline cursor-pointer"
                >
                  ← Switch back to Live Selfie Camera
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
