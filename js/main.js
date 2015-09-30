// Variables
var context, bufferLoader, source;
var boum, tchac, clap;
var isPlaying = false;      // Are we currently playing?
var startTime;              // The start time of the entire sequence.
var current16thNote;        // What note is currently last scheduled?
var maxNotes = 8;
var tempo = 120;            // Tempo (in beats per minute)
var lookahead = 25.0;       // How frequently to call scheduling function (in milliseconds)
var scheduleAheadTime = 0.1;// How far ahead to schedule audio (sec)
var nextNoteTime = 0.0;     // When the next note is due.
var intervalID = 0;         // setInterval identifier.
var last16thNoteDrawn = -1; // the last "box" we drew on the screen
var notesInQueue = [];      // the notes that have been put into the web audio, and may or may not have played yet. {note, time}
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
    var container = document.createElement( 'div' );
    container.className = "container";
    canvas = document.createElement( 'canvas' );
    canvasContext = canvas.getContext( '2d' );
    canvas.width = window.innerWidth; 
    canvas.height = window.innerHeight; 
    document.body.appendChild( container );
    container.appendChild(canvas);  
    canvasContext.strokeStyle = "#ffffff";
    canvasContext.lineWidth = 2;
    window.onorientationchange = resetCanvas;
    window.onresize = resetCanvas;

    // Interface elements
    var textarea = document.getElementById("textarea");

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
    requestAnimFrame(draw); 
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

function nextNote() {
    // Advance current note and time by a 8th note...
    var secondsPerBeat = 60.0 / tempo;	// Notice this picks up the current tempo value to calculate beat length.
    nextNoteTime += 0.5 * secondsPerBeat;	// Add beat length to last beat time

    current16thNote++;	// Advance the beat number, wrap to zero
    if (current16thNote == maxNotes) {
        current16thNote = 0;
    }
}

function scheduleNote( beatNumber, time ) {
    // push the note on the queue, even if we're not playing.
    notesInQueue.push( { note: beatNumber, time: time } );

    if (beatNumber%1)
        return; // we're not playing non-8th 16th notes
 

    var note = track[beatNumber];
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

function scheduler() {
	// while there are notes that will need to play before the next interval, 
	// schedule them and advance the pointer.
	while (nextNoteTime < context.currentTime + scheduleAheadTime ) {
		scheduleNote( current16thNote, nextNoteTime );
		nextNote();
	}
	timerID = window.setTimeout( scheduler, lookahead );
}

function play() {
	isPlaying = !isPlaying;

    createTrack(textarea.value);

	if (isPlaying) { // start playing
        maxNotes = track.length;
		current16thNote = 0;
		nextNoteTime = context.currentTime;
		scheduler();	// kick off scheduling
		return "stop";
	} else {
		window.clearTimeout( timerID );
		return "play";
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
    var currentNote = last16thNoteDrawn;
    var currentTime = context.currentTime;

    while (notesInQueue.length && notesInQueue[0].time < currentTime) {
        currentNote = notesInQueue[0].note;
        notesInQueue.splice(0,1);   // remove note from queue
    }

    // We only need to draw if the note has moved.
    if (last16thNoteDrawn != currentNote) {
        var x = Math.floor( canvas.width / 18 );
        canvasContext.clearRect(0,0,canvas.width, canvas.height); 
        for (var i=0; i<maxNotes; i++) {
            canvasContext.fillStyle = ( currentNote == i ) ? 
                ((currentNote%4 == 0)?"red":"blue") : "black";
            canvasContext.fillRect( x * (i+1), x, x/2, x/2 );
        }
        last16thNoteDrawn = currentNote;
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

function createTrack(string) {
// "Boum, Tchac. Boum Tchac."
track = string.replace(/\,/g, " pause");
track = track.replace(/\./g, " pause pause");
track = track.replace(/\;/g, " pause pause pause");
track = track.replace(/boum/gi, "boum");
track = track.replace(/tchac/gi, "tchac");
track = track.replace(/clap/gi, "clap");
track = track.replace(/tchic/gi, "tchic");
track = track.split(" ");
return track;
}