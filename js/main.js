const KEYSTROKES_PER_WORD = 5;
// const ROAD_LENGTH = 535;

const Main = (function($) {
    let 
        text,
        words,
        wordPointer,
        started_at,
        time_end,
        total_time,
        countDownTime,
        keystrokes,
        max,
        // distance,
        mySpeed,
        offsetTop,
        total_keystrokes,
        accuracy,
        errors,
        lastWord,
        $word,
        para_id,
        keystroke_count;

    const 
        $inputfield = $('input#inputfield'),
        $racecar = $('#racecar'),
        $paragraph = $('p#sourceText'),
        $chart = $('#chart'),
        $countDownTimer = $("#count-down");

    const reset = (response) => {
        text = JSON.parse(response).para;
        para_id = JSON.parse(response).id;
        words = text.split(' ');
        wordPointer = -1;
        keystrokes = 0;
        max = 0;
        total_keystrokes = text.length + (text.match(/[A-Z]/g) || []).length;
        // distance = ROAD_LENGTH / total_keystrokes;
        total_time = 60; // seconds
        offsetTop = 21;
        started_at = 0;
        accuracy = 0;
        lastWord = '';
        errors = 0;
        keystroke_count = 0;
        
        $countDownTimer.text("01:00");
        $chart.hide();
        $inputfield.prop('disabled', false);
        $inputfield.focus();
        $inputfield.val('');
        $racecar.css('left', 0); 
        $('.text-container').scrollTop(0);

        clearInterval(countDownTime);
    };

    const calculate = () => {
        time_end = (new Date().getTime() - started_at) / 1000; 
        mySpeed = Math.round(((keystrokes / KEYSTROKES_PER_WORD / time_end) * 60) * 100) / 100;

        if (keystrokes > 0) {
            accuracy = Math.round((100 - ((errors/KEYSTROKES_PER_WORD) * 100 / (keystrokes/KEYSTROKES_PER_WORD))) * 100) / 100;
        }
    };

    const isAuthorized = () => {
    	return localStorage.getItem('user');
    };

    const checkUser = () => {
    	if ( isAuthorized() ) {
            $('#login').text(localStorage.getItem('user'))
		}
    };

    const showLoginPrompt = () => {
    	let username = '';

    	if ( isAuthorized() ) {
    		username = localStorage.getItem('user');
    	} else {
            username = prompt('Beta testing. Please, type your username.');

            while (username.length < 5) {
                username = prompt('Minimum 5 chars. Your username:');
            }

            $.ajax({
                type: "POST",
                url: './server/login.php',
                data: {username: username},
                success: function(response) {
                    let res = JSON.parse(response);
                    alert(res.message);

                    if (res.status === 1) {
                        localStorage.setItem('user', username);
                        $('#login').text(username);
                    }
                }
            });
    	}
    };

    const getScore = () => {
        $.ajax({
            type: "POST",
            url: './server/score.php',
            success: function(response) {
                $('#score').html(response);
            }
        });
    };

    const showResults = () => {
        if (keystroke_count < text.length) return;

        if (isAuthorized()) {
            $.ajax({
                type: "POST",
                url: './server/insert.php',
                data: {
                    u: localStorage.getItem('user'), 
                    s: mySpeed,
                    c: text,
                    ip: para_id,
                    timer: time_end,
                    
                },
                success: function() {
                    getScore();
                }
            });
        }

        $('#user_score').text(`${mySpeed} wpm`);
        $('#accuracy').text(accuracy + '%');
        $('#time').text(time_end + ' sec');

        $inputfield.val('');
        $inputfield.prop('disabled', true);
        $paragraph.hide();
        $chart.show();

        // Debugging
        console.log('total chars: ' + text.length);
        console.log('keystrokes: ' + keystrokes);
        console.log('time: ' +  time_end);
        console.log('accuracy: ' + accuracy);
        console.log('count: ' + keystroke_count);
    };

    const getTextArray = () => {
        return text.split(" ").map((word, id) => {
            return `<span id="${id}">${word}</span>`;
        });
    };

    const highlightWord = () => {
        $word = $(`#${++wordPointer}`);
        $word.addClass('underlined');
    };

    const endGame = () => {
        clearInterval(countDownTime); 
        calculate();
        showResults();
    };

    const moveCar = () => {
        $racecar.css('left', ($('.race').width() - 100) / total_keystrokes * keystrokes);
    };

    function validateText() {
        keystroke_count++;

        if (this.value === ' ') {
            this.value = '';
            return;
        }

        let inputValue = this.value;
        let wordSubstring = words[wordPointer].substr(0, inputValue.length);
        let isEqual = inputValue.trimEnd() === words[wordPointer];
        let isSpaceKeyPressed = inputValue.length - 1 === words[wordPointer].length;
        let isLastWord = wordPointer === words.length - 1;

        if (isSpaceKeyPressed && isEqual) {
            $inputfield.val('');
            $word.attr('class', 'correct');
            highlightWord();
            max = 0;

            // Spaces need 1 keystroke
            keystrokes++;

            // Uppercase letter = 2 keystrokes
            if (inputValue[0] === inputValue[0].toUpperCase()) {
                keystrokes++;
            }

            if ($word[0].offsetTop !== offsetTop) {
                $('.text-container').scrollTop($word[0].offsetTop - 21);
                offsetTop = $word[0].offsetTop;
            }

            return;
        }

        if (inputValue === wordSubstring) {
            if (max < inputValue.length) {
                max = inputValue.length;
                keystrokes++;
            }

            moveCar();
            $word.attr('class', 'underlined');
            $inputfield.css('background-color', '#ffffff');
        } else {

            if (lastWord !== words[wordPointer]) {
                errors++;
            }

            lastWord = words[wordPointer];

            $word.attr('class', 'invalid-char');
            $inputfield.css('background-color', '#fbc7db');
        }

        if (isLastWord && isEqual) {
            endGame();
        }
    }

    const startTimers = (e) => {
        const letters = /^[0-9a-zA-Z]+$/;

        if (String.fromCharCode(e.keyCode).match(letters) || e.keyCode === 16) {

            console.log('timer started');

            started_at = new Date().getTime();

            countDown();
            countDownTime = setInterval(countDown, 1000);

            $inputfield.unbind('keydown');

            $.ajax({
                type: "POST",
                url: './server/inserts.php',
                data: { username: localStorage.getItem('user') },
                success: function(response) {
                    console.log(response)
                }
            });
        }
    };

    const countDown = () => {
        let minutes = parseInt(total_time / 60);
        let seconds = total_time % 60;

        minutes = minutes < 10 ? "0" + minutes : minutes;
        seconds = seconds < 10 ? "0" + seconds : seconds;

        // Display timer
        $countDownTimer.text(minutes + ":" + seconds);

        if (--total_time < 0) {
            endGame();
        }
    };

    return {
        start: function() {
            this.post();
            getScore();

            $( window ).resize(moveCar);

            checkUser();
			$('#login').on('click', showLoginPrompt);
            $('#reload-btn').on('click', () => this.post());
        },

        post: function() {
            $.ajax({
                type: "GET",
                url: './server/para.php',
                success: function(response) {
                    reset(response);

                    $paragraph.html(getTextArray().join(' '));
                    $paragraph.show();

                    highlightWord();
                    
                    $inputfield.unbind();
                    $inputfield.on('keydown', e => startTimers(e));
                    $inputfield.on('input', validateText);
                }
            });
        },
    };
})(jQuery);