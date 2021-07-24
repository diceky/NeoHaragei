const video = document.getElementById("video");
const select = document.getElementById("select");
const sliderMasterVolume = document.getElementById("volume");
const sliderBpm = document.getElementById("bpm");
const sliderLowpass = document.getElementById("lowpass");
const sliderHighpass = document.getElementById("highpass");
const help = document.getElementById("help");
const manual = document.getElementById("manual");
const manualClose = document.getElementById("manual-close");

let currentStream;
let beatIsPlaying = false;
let faceIsDetected = false;
let isSnapCamera = false;
Tone.Destination.volume.value = -20;
Tone.Destination.mute = true;

const lowPassfilter = new Tone.Filter(10000, "lowpass");
const highPassfilter = new Tone.Filter(0, "highpass");
const autoPanner = new Tone.AutoPanner("8n").start();

const delay = new Tone.FeedbackDelay("8n", 0.5).chain(
  new Tone.Volume(-15),
  lowPassfilter,
  highPassfilter,
  Tone.Destination
);
const synth1 = new Tone.FMSynth().connect(delay);

const distortion = new Tone.Distortion(0.9).chain(
  new Tone.Volume(-15),
  lowPassfilter,
  highPassfilter,
  Tone.Destination
);
const synth2 = new Tone.AMSynth().connect(distortion);

const synth3 = new Tone.DuoSynth().connect(distortion);

const samplerJapanese = new Tone.Sampler({
  urls: {
    C4: "japanese.mp3",
  },
  release: 1,
  baseUrl: "/sounds/",
}).chain(
  autoPanner,
  lowPassfilter,
  highPassfilter,
  new Tone.Volume(-12),
  Tone.Destination
);

const samplerSnapCamera = new Tone.Sampler({
  urls: {
    C4: "okinawa.mp3",
  },
  release: 1,
  baseUrl: "/sounds/",
}).chain(
  autoPanner,
  lowPassfilter,
  highPassfilter,
  new Tone.Volume(-2),
  Tone.Destination
);

const samplerFlute = new Tone.Sampler({
  urls: {
    A1: "A1.mp3",
    A2: "A2.mp3",
  },
  baseUrl: "https://tonejs.github.io/audio/casio/",
}).toDestination();

const samplerNeoHaragei = new Tone.Sampler({
  urls: {
    C4: "neo-haragei.mp3",
  },
  release: 1,
  baseUrl: "/sounds/",
}).chain(
  autoPanner,
  lowPassfilter,
  highPassfilter,
  new Tone.Volume(-2),
  Tone.Destination
);

const kick = new Tone.Player("/sounds/kick.mp3").chain(
  lowPassfilter,
  highPassfilter,
  new Tone.Volume(-8),
  Tone.Destination
);

const snare = new Tone.Player("/sounds/snare.mp3").chain(
  lowPassfilter,
  highPassfilter,
  new Tone.Volume(-8),
  Tone.Destination
);

const hihat = new Tone.Player("/sounds/hihat-closed.wav").chain(
  lowPassfilter,
  highPassfilter,
  new Tone.Volume(-8),
  Tone.Destination
);

const clap = new Tone.Player("/sounds/clap.mp3").chain(
  lowPassfilter,
  highPassfilter,
  new Tone.Volume(-8),
  Tone.Destination
);

const yo = new Tone.Player("/sounds/yo_cut.mp3").chain(
  autoPanner,
  new Tone.Volume(-8),
  Tone.Destination
);

const now = Tone.now();

const loopKick = new Tone.Loop((time) => {
  kick.start(time);
}, "4n").start(0);

const loopKickDouble = new Tone.Loop((time) => {
  kick.start(time);
}, "8n").start(0);

const loopHihat = new Tone.Loop((time) => {
  hihat.start(time);
}, "4n").start("8n");

const loopHihatDouble = new Tone.Loop((time) => {
  hihat.start(time);
}, "8n").start("8n");

const loopHihatRush = new Tone.Loop((time) => {
  hihat.start(time);
}, "16n").start(0);

const loopSnare = new Tone.Loop((time) => {
  snare.start(time);
}, "2n").start(0);

const loopClap = new Tone.Loop((time) => {
  clap.start(time);
  clap.start(time + Tone.Time("8n").toSeconds());
}, "1n").start("14n");

const loopClapRush = new Tone.Loop((time) => {
  clap.start(time);
}, "8n").start(0);

const loopSnapCamera = new Tone.Loop((time) => {
  samplerSnapCamera.triggerAttackRelease(["B4"], "1n", time);
}, Tone.Time("2m").toSeconds()).start("12n");

const loopKabuki = new Tone.Loop((time) => {
  samplerJapanese.triggerAttackRelease(["Bb4"], "2n", time);
}, Tone.Time("2m").toSeconds()).start("12n");

const loopNeoHaragei = new Tone.Loop((time) => {
  samplerNeoHaragei.triggerAttackRelease(["B3"], "1n", time);
}, Tone.Time("1m").toSeconds()).start("12n");

Tone.Transport.bpm.value = 120;

document.getElementById("btn-start").addEventListener("click", () => {
  if (faceIsDetected) {
    document.getElementById("intro").classList.add("hide");
    document.getElementById("intro-bg").classList.add("hide");
    document.getElementById("btn-play").classList.remove("hide");
  }
});

document.getElementById("btn-play").addEventListener("click", async () => {
  if (!beatIsPlaying) {
    await Tone.start();
    console.log("audio is ready");
    Tone.Transport.start();
    Tone.Destination.mute = false;
    beatIsPlaying = true;
    document.getElementById("btn-play").innerHTML = "STOP";
  } else {
    Tone.Transport.stop();
    Tone.Destination.mute = true;
    beatIsPlaying = false;
    document.getElementById("btn-play").innerHTML = "PLAY";
  }
});

help.addEventListener("click", () => {
  manual.classList.remove("hide");
});

manualClose.addEventListener("click", () => {
  manual.classList.add("hide");
});

Promise.all([
  faceapi.nets.tinyFaceDetector.loadFromUri("/models"),
  faceapi.nets.faceLandmark68Net.loadFromUri("/models"),
  faceapi.nets.faceRecognitionNet.loadFromUri("/models"),
  faceapi.nets.faceExpressionNet.loadFromUri("/models"),
]).then(startVideo);

function startVideo() {
  var constraints = { video: {} };
  navigator.mediaDevices
    .getUserMedia(constraints)
    .then((stream) => {
      currentStream = stream;
      video.srcObject = stream;
      video.onloadedmetadata = function (e) {
        video.play();
      };
      return navigator.mediaDevices.enumerateDevices();
    })
    .then(gotDevices)
    .catch((err) => {
      console.log(err.name + ": " + err.message);
    });
}

function getKeysWithHighestValue(o, n) {
  var keys = Object.keys(o);
  keys.sort(function (a, b) {
    return o[b] - o[a];
  });
  return keys.slice(0, n);
}

function getTop(l) {
  return l.map((a) => a.y).reduce((a, b) => Math.min(a, b));
}

function getMeanPosition(l) {
  return l
    .map((a) => [a.x, a.y])
    .reduce((a, b) => [a[0] + b[0], a[1] + b[1]])
    .map((a) => a / l.length);
}

function gotDevices(mediaDevices) {
  select.innerHTML = "";
  const defaultOption = document.createElement("option");
  defaultOption.appendChild(document.createTextNode("Select Camera"));
  select.appendChild(defaultOption);
  let count = 1;
  mediaDevices.forEach((mediaDevice) => {
    if (mediaDevice.kind === "videoinput") {
      const option = document.createElement("option");
      option.value = mediaDevice.deviceId;
      const label = mediaDevice.label || `Camera ${count++}`;
      const textNode = document.createTextNode(label);
      option.appendChild(textNode);
      select.appendChild(option);
    }
  });
}

function stopMediaTracks(stream) {
  stream.getTracks().forEach((track) => {
    track.stop();
  });
}

video.addEventListener("play", () => {
  //delete old canvas
  let oldCanvas = document.getElementsByTagName("canvas");
  if (oldCanvas[0] != null) oldCanvas[0].remove();
  //make new canvas
  const canvas = faceapi.createCanvasFromMedia(video);
  document.body.append(canvas);
  canvas.style.zIndex = "1";
  const displaySize = { width: video.width, height: video.height };
  faceapi.matchDimensions(canvas, displaySize);

  setInterval(async () => {
    const detections = await faceapi
      .detectSingleFace(
        video,
        new faceapi.TinyFaceDetectorOptions({ scoreThreshold: 0.3 })
      )
      .withFaceLandmarks()
      .withFaceExpressions();
    const resizedDetections = faceapi.resizeResults(detections, displaySize);
    canvas.getContext("2d").clearRect(0, 0, canvas.width, canvas.height);
    faceapi.draw.drawDetections(canvas, resizedDetections);
    faceapi.draw.drawFaceLandmarks(canvas, resizedDetections);
    faceapi.draw.drawFaceExpressions(canvas, resizedDetections);

    if (faceIsDetected) {
      document.getElementById("btn-start").innerHTML = "START HARAGEI";
      document.getElementById("btn-start").classList.remove("disabled");
    }

    if (detections === undefined || detections.length == 0) {
      console.log("waiting for face ....");
    } else {
      faceIsDetected = true;

      var expressions = detections.expressions;
      var currentExpression = getKeysWithHighestValue(expressions, 1);

      var faceX = detections.detection.box.x;
      var positions = detections.landmarks.positions;
      var mouthTop = positions[63];
      var mouthBottom = positions[67];
      var mouthSize = Math.sqrt(
        Math.pow(mouthTop.x - mouthBottom.x, 2) +
          Math.pow(mouthTop.y - mouthBottom.y, 2)
      );
      var eye_right = getMeanPosition(detections.landmarks.getRightEye());
      var eye_left = getMeanPosition(detections.landmarks.getLeftEye());
      var nose = getMeanPosition(detections.landmarks.getNose());
      var mouth = getMeanPosition(detections.landmarks.getMouth());
      var jaw = getTop(detections.landmarks.getJawOutline());
      var rx = (jaw - mouth[1]) / detections.detection.box.height;
      var ry =
        (eye_left[0] + (eye_right[0] - eye_left[0]) / 2 - nose[0]) /
        detections.detection.box.width;
      var eyebrow_height = Math.abs(positions[20].y - positions[38].y);

      // change Low Pass / High Pass filter frequency basedn on face pos X
      let frequency = 0;
      if (isSnapCamera) {
        if (faceX <= 300) {
          frequency = (faceX / 300) * 9000 + 1000;
          if (frequency < 1000) frequency = 1000;
          else if (frequency > 9000) frequency = 10000;
          lowPassfilter.frequency.value = frequency;
          document.getElementById("lowpass-content").innerHTML =
            Math.abs(100 - (frequency - 1000) / 90).toFixed(0) + "%";
        } else if (faceX >= 600) {
          frequency = (Math.abs(600 - faceX) / 400) * 5000;
          if (frequency < 500) frequency = 0;
          else if (frequency >= 4000) frequency = 4000;
          highPassfilter.frequency.value = frequency;
          document.getElementById("highpass-content").innerHTML =
            (frequency / 40).toFixed(0) + "%";
        }
      } else {
        //normal camera
        if (faceX <= 200) {
          frequency = (faceX / 200) * 9000 + 1000;
          if (frequency < 1000) frequency = 1000;
          else if (frequency > 9000) frequency = 10000;
          lowPassfilter.frequency.value = frequency;
          document.getElementById("lowpass-content").innerHTML =
            Math.abs(100 - (frequency - 1000) / 90).toFixed(0) + "%";
        } else if (faceX >= 300) {
          frequency = (Math.abs(300 - faceX) / 200) * 5000;
          if (frequency < 500) frequency = 0;
          else if (frequency >= 4000) frequency = 4000;
          highPassfilter.frequency.value = frequency;
          document.getElementById("highpass-content").innerHTML =
            (frequency / 40).toFixed(0) + "%";
        }
      }

      if (ry < 0.04 && ry > -0.04) {
        if (isSnapCamera) {
          if (mouthSize < 40) {
            synth1.triggerRelease();
            synth2.triggerRelease();
            samplerFlute.triggerRelease();
          } else if (mouthSize < 42 && mouthSize >= 40)
            synth1.triggerAttack("C4", now);
          else if (mouthSize < 44 && mouthSize >= 42)
            synth1.triggerAttack("E4", now);
          else if (mouthSize < 46 && mouthSize >= 44)
            synth1.triggerAttack("F4", now);
          else if (mouthSize < 48 && mouthSize >= 46)
            synth1.triggerAttack("G4", now);
          else if (mouthSize >= 48) synth1.triggerAttack("B4", now);
        } else {
          if (mouthSize < 20) {
            synth1.triggerRelease();
            synth2.triggerRelease();
            samplerFlute.triggerRelease();
          } else if (mouthSize < 22 && mouthSize >= 20)
            synth1.triggerAttack("C4", now);
          else if (mouthSize < 24 && mouthSize >= 22)
            synth1.triggerAttack("E4", now);
          else if (mouthSize < 26 && mouthSize >= 24)
            synth1.triggerAttack("F4", now);
          else if (mouthSize < 28 && mouthSize >= 26)
            synth1.triggerAttack("G4", now);
          else if (mouthSize >= 28) synth1.triggerAttack("B4", now);
        }
      } else if (ry >= 0.04) {
        if (isSnapCamera) {
          if (mouthSize < 40) {
            synth1.triggerRelease();
            synth2.triggerRelease();
            synth3.triggerRelease();
          } else if (mouthSize < 42 && mouthSize >= 40)
            synth2.triggerAttack("D2", now);
          else if (mouthSize < 44 && mouthSize >= 42)
            synth2.triggerAttack("F2", now);
          else if (mouthSize < 46 && mouthSize >= 44)
            synth2.triggerAttack("A2", now);
          else if (mouthSize < 48 && mouthSize >= 46)
            synth2.triggerAttack("B2", now);
          else if (mouthSize >= 48) synth2.triggerAttack("C3", now);
        } else {
          if (mouthSize < 20) {
            synth1.triggerRelease();
            synth2.triggerRelease();
            synth3.triggerRelease();
          } else if (mouthSize < 22 && mouthSize >= 20)
            synth2.triggerAttack("D2", now);
          else if (mouthSize < 24 && mouthSize >= 22)
            synth2.triggerAttack("F2", now);
          else if (mouthSize < 26 && mouthSize >= 24)
            synth2.triggerAttack("A2", now);
          else if (mouthSize < 28 && mouthSize >= 26)
            synth2.triggerAttack("B2", now);
          else if (mouthSize >= 28) synth2.triggerAttack("C3", now);
        }
      } else if (ry <= -0.04) {
        if (isSnapCamera) {
          if (mouthSize < 40) {
            synth1.triggerRelease();
            synth2.triggerRelease();
            synth3.triggerRelease();
          } else if (mouthSize < 42 && mouthSize >= 40)
            synth3.triggerAttack("E4", now);
          else if (mouthSize < 44 && mouthSize >= 42)
            synth3.triggerAttack("G4", now);
          else if (mouthSize < 46 && mouthSize >= 44)
            synth3.triggerAttack("B4", now);
          else if (mouthSize < 48 && mouthSize >= 46)
            synth3.triggerAttack("C5", now);
          else if (mouthSize >= 48) synth3.triggerAttack("E5", now);
        } else {
          if (mouthSize < 20) {
            synth1.triggerRelease();
            synth2.triggerRelease();
            synth3.triggerRelease();
          } else if (mouthSize < 22 && mouthSize >= 20)
            synth3.triggerAttack("E5", now);
          else if (mouthSize < 24 && mouthSize >= 22)
            synth3.triggerAttack("G4", now);
          else if (mouthSize < 26 && mouthSize >= 24)
            synth3.triggerAttack("B5", now);
          else if (mouthSize < 28 && mouthSize >= 26)
            synth3.triggerAttack("C6", now);
          else if (mouthSize >= 28) synth3.triggerAttack("E6", now);
        }
      }

      document.getElementById("mouthSize").innerHTML =
        "Mouth Size: " + mouthSize;

      document.getElementById("headRotationX").innerHTML =
        "Head Rotation X: " + rx;
      if (Math.abs(ry) < 0.02) {
        // hihat and clap
        loopKabuki.stop();
        loopSnapCamera.stop();
        if (loopNeoHaragei.state == "stopped") loopNeoHaragei.start("12n");
        loopKick.stop();
        loopSnare.stop();
        loopKickDouble.stop();
        loopHihatDouble.stop();
        loopHihatRush.stop();
        loopClapRush.stop();
        if (loopHihat.state == "stopped") loopHihat.start(0);
        document.getElementById("sampling-content").innerHTML = "NEO HARAGEI";
      } else if (Math.abs(ry) < 0.04) {
        // standard
        if (loopKabuki.state == "stopped") loopKabuki.start("12n");
        loopSnapCamera.stop();
        loopNeoHaragei.stop();
        loopKickDouble.stop();
        loopHihatDouble.stop();
        loopHihatRush.stop();
        loopClapRush.stop();
        if (loopKick.state == "stopped") loopKick.start(0);
        if (loopSnare.state == "stopped") loopSnare.start(0);
        document.getElementById("sampling-content").innerHTML = "KABUKI";
      } else if (Math.abs(ry) < 0.06) {
        //double time
        loopKabuki.stop();
        loopNeoHaragei.stop();
        if (loopSnapCamera.state == "stopped") loopSnapCamera.start("12n");
        loopKick.stop();
        loopHihat.stop();
        loopClapRush.stop();
        loopHihatRush.stop();
        if (loopKickDouble.state == "stopped") loopKickDouble.start(0);
        if (loopHihatDouble.state == "stopped") loopHihatDouble.start(0);
        document.getElementById("sampling-content").innerHTML = "OKINAWA";
      } else {
        // rush
        loopKabuki.stop();
        loopNeoHaragei.stop();
        loopSnapCamera.stop();
        loopKickDouble.stop();
        loopHihatDouble.stop();
        if (loopHihatDouble.state == "stopped") loopHihatRush.start(0);
        if (loopClapRush.state == "stopped") loopClapRush.start(0);
        document.getElementById("sampling-content").innerHTML = "none";
      }

      // document.getElementById("headRotationY").innerHTML =
      //   "Head Rotation Y: " + ry;
      // let swing = Math.abs(ry) * 10 * 0.7;
      // Tone.Transport.swing = swing.toFixed(1);
      // document.getElementById("swing-content").innerHTML = swing.toFixed(1);

      document.getElementById("eyebrow").innerHTML =
        "Right Eyebrow Height: " + eyebrow_height;
      if (isSnapCamera) {
        if (eyebrow_height > 60 && yo.state == "stopped") {
          yo.start("@4n");
        }
      } else {
        if (eyebrow_height > 25 && yo.state == "stopped") {
          yo.start("@4n");
        }
      }
      document.getElementById("transport").innerHTML =
        "Tone.Transport: " + Tone.Transport.position;
    }
  }, 100);
});

select.addEventListener("change", () => {
  if (typeof currentStream !== "undefined") {
    stopMediaTracks(currentStream);
  }
  var constraints = {
    video: {
      deviceId: {
        exact: select.value,
      },
    },
  };
  navigator.mediaDevices
    .getUserMedia(constraints)
    .then((stream) => {
      currentStream = stream;
      video.srcObject = stream;
      video.onloadedmetadata = function (e) {
        video.play();
      };
    })
    .catch((err) => {
      console.log(err.name + ": " + err.message);
    });
  if (select.options[select.selectedIndex].text == "Snap Camera") {
    isSnapCamera = true;
    video.width = 975;
    video.height = 560;
  } else {
    isSnapCamera = false;
    video.width = 720;
    video.height = 560;
  }
});

sliderMasterVolume.addEventListener("change", () => {
  Tone.Destination.volume.value = sliderMasterVolume.value;
});

sliderBpm.addEventListener("change", () => {
  Tone.Transport.bpm.value = sliderBpm.value; //60 - 180
});
