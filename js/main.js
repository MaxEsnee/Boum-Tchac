// Variables
var context, bufferLoader, source;
var boum, tchac, clap;
var trackList = []; var trackId;
var trackListContainer;
var startTime;              // The start time of the entire sequence.
var maxNotes = 8;
var tempo = 120;            // Tempo (in beats per minute)
var lookahead = 25.0;       // How frequently to call scheduling function (in milliseconds)
var scheduleAheadTime = 0.1;// How far ahead to schedule audio (sec)
// var currentNote;        // What note is currently last scheduled?
// var nextNoteTime = 0.0;     // When the next note is due.
// var intervalID = 0;         // setInterval identifier.
// var lastNoteDrawn = -1; // the last "box" we drew on the screen
// var notesInQueue = [];      // the notes that have been put into the web audio, and may or may not have played yet. {note, time}
var canvas, canvasContext;

// First, let's shim the requestAnimationFrame API, with a setTimeout fallback
window.requestAnimFrame = (function(){
    return  window.requestAnimationFrame ||
    window.webkitRequestAnimationFrame ||
    window.mozRequestAnimationFrame ||
    window.oRequestAnimationFrame ||
    window.msRequestAnimationFrame ||
    function( callback ){
        window.setTimeout(callback, 1000 / 60);
    };
})();

window.onload = init;

function init(){

    //Canvas
    // var container = document.createElement( 'div' );
    // container.className = "container";
    // canvas = document.createElement( 'canvas' );
    // canvasContext = canvas.getContext( '2d' );
    // canvas.width = window.innerWidth; 
    // canvas.height = window.innerHeight; 
    // document.body.appendChild( container );
    // container.appendChild(canvas);  
    // canvasContext.strokeStyle = "#ffffff";
    // canvasContext.lineWidth = 2;
    // window.onorientationchange = resetCanvas;
    // window.onresize = resetCanvas;

    // DOM Elements
    trackListContainer = document.getElementById("track-list-container");

    // Audio context
    window.AudioContext = window.AudioContext || window.webkitAudioContext;
    context = new AudioContext();

    // Load sounds
    bufferLoader = new BufferLoader(
    context,
    [
      'sounds/boum.mp3',
      'sounds/tchac.mp3',
      'sounds/clap.mp3',
      'sounds/tchic.mp3'
    ],
    finishedLoading
    );

    bufferLoader.load();

    //Start the drawing loop.
    // requestAnimFrame(draw); 

    newTrack();
}

function finishedLoading(bufferList) {
  boum = context.createBufferSource();
  tchac = context.createBufferSource();
  clap = context.createBufferSource();
  tchic = context.createBufferSource();

  boum.buffer = bufferList[0];
  tchac.buffer = bufferList[1];
  clap.buffer = bufferList[2];
  tchic.buffer = bufferList[3];
}

function newTrack() {
    trackId = trackList.length;

    var track = {
        id: trackId, 
        isPlaying: false, 
        currentNote: 0,     // What note is currently last scheduled?
        nextNoteTime: 0.0,  // When the next note is due.
        intervalId: 0,      // setInterval identifier.
        lastNoteDrawn: -1,  // the last "box" we drew on the screen
        notesInQueue: [],    // the notes that have been put into the web audio, and may or may not have played yet. {note, time}
        maxNotes: 0
    };

    trackList.push(track);
    createTrack(track);
    // createVisualisation(trackID);
}

function createTrack(track) {
    // Track Container
    track.container = document.createElement('div');
    track.container.id = "track-"+track.id+"-container";
    // Textarea
    track.input = document.createElement('textarea');
    track.input.id = "track-"+track.id+"-input";
    // Button Play
    track.buttonPlay = document.createElement('button');
    track.buttonPlay.id = "track-"+track.id+"-play";
    track.buttonPlay.innerHTML = "Play";

    // Adding the elements to the page
    trackListContainer.appendChild(track.container);
    track.container.appendChild(track.input);
    track.container.appendChild(track.buttonPlay);

    // Event Listener
    track.buttonPlay.addEventListener("click", function() {
        play(track);
    })
}



function play(track) {
    track.sheet = readTrack(track.input.value);
    track.isPlaying = !track.isPlaying;

    if (track.isPlaying) { // start playing
        track.maxNotes = track.sheet.length;
        track.currentNote = 0;
        track.nextNoteTime = context.currentTime;
        scheduler(track);    // kick off scheduling
        return "stop";
    } else {
        window.clearTimeout(track.timerID);
        return "play";
    }
}

function scheduler(track) {
    // while there are notes that will need to play before the next interval, 
    // schedule them and advance the pointer.
    while (track.nextNoteTime < context.currentTime + scheduleAheadTime ) {
        scheduleNote(track, track.currentNote, track.nextNoteTime);
        nextNote(track);
    }
    track.timerID = window.setTimeout( function() {
        scheduler(track);
    }, lookahead );
}

function nextNote(track) {
    // Advance current note and time by a 8th note...
    var secondsPerBeat = 60.0 / tempo;	// Notice this picks up the current tempo value to calculate beat length.
    track.nextNoteTime += 0.5 * secondsPerBeat;	// Add beat length to last beat time

    track.currentNote++;	// Advance the beat number, wrap to zero
    if (track.currentNote == track.maxNotes) {
        track.currentNote = 0;
    }
}

function scheduleNote(track, beatNumber, time) {
    // push the note on the queue, even if we're not playing.
    track.notesInQueue.push({note: beatNumber, time: time});

    // if (beatNumber%1)
    //     return; // we're not playing non-8th 16th notes
 
    var note = track.sheet[beatNumber];
    if (note == "boum") {
        playSound(boum);
    }
    if (note == "tchac") {
        playSound(tchac);
    }
    if (note == "clap") {
        playSound(clap);
    }
    if (note == "tchic") {
        playSound(tchic);
    }
}

function resetCanvas (e) {
    // resize the canvas - but remember - this clears the canvas too.
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    //make sure we scroll to the top left.
    window.scrollTo(0,0); 
}

function draw() {
    var currentNote = lastNoteDrawn;
    var currentTime = context.currentTime;

    while (notesInQueue.length && notesInQueue[0].time < currentTime) {
        currentNote = notesInQueue[0].note;
        notesInQueue.splice(0,1);   // remove note from queue
    }

    // We only need to draw if the note has moved.
    if (lastNoteDrawn != currentNote) {
        var x = Math.floor( canvas.width / 18 );
        canvasContext.clearRect(0,0,canvas.width, canvas.height); 
        for (var i=0; i<maxNotes; i++) {
            canvasContext.fillStyle = ( currentNote == i ) ? 
                ((currentNote%4 == 0)?"red":"blue") : "black";
            canvasContext.fillRect( x * (i+1), x, x/2, x/2 );
        }
        lastNoteDrawn = currentNote;
    }

    // set up to draw again
    requestAnimFrame(draw);
}

function playSound(what) {
    source = context.createBufferSource();
    // Connect graph
    source.buffer = what.buffer;
    source.connect(context.destination);
    source.start();
}

function readTrack(string) {
// "Boum, Tchac. Boum Tchac."
trackSheet = string.replace(/\,/g, " pause");
trackSheet = trackSheet.replace(/\./g, " pause pause");
trackSheet = trackSheet.replace(/\;/g, " pause pause pause");
trackSheet = trackSheet.replace(/boum/gi, "boum");
trackSheet = trackSheet.replace(/tchac/gi, "tchac");
trackSheet = trackSheet.replace(/clap/gi, "clap");
trackSheet = trackSheet.replace(/tchic/gi, "tchic");
trackSheet = trackSheet.split(" ");
return trackSheet;
}