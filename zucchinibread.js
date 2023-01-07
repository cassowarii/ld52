"use strict";

/* Please forgive my strictly procedural style here.
 * Been writing too much C lately... */

/* ---- Util ---- */

function goodmod(x, n) {
     return ((x%n)+n)%n;
}

/* ---- Resource loading / loading screen ---- */

let _audiocheck = document.createElement('audio');

let _SFX_ARRAY_SIZE = 10;

/* Returns a callback that should be called when a resource finishes loading. */
function _register_resource(name, game, callback) {
    game._total_things_to_load ++;
    console.log("Loading", name + ". Things to load:", game._total_things_to_load);
    return function() {
        if (!game.ready_to_go) {
            game._things_loaded ++;
            console.log("Loaded", name + ". Things loaded:", game._things_loaded, "/", game._total_things_to_load);
            _check_if_loaded(game);
            if (callback) {
                callback();
            }
        }
    }
}

/* Check if audio failed to load bc file doesn't exist and print error message. */
/* TODO add the same thing for an image */
function _sound_resource_error(name, game, audio) {
    return function(e) {
        if (audio === undefined) {
            console.error("Error loading resource, skipping:", name);
            game._things_loaded ++;
            _check_if_loaded(game);
        }
    }
}

/* Check if the game has loaded everything and if so show the 'click to start' image */
function _check_if_loaded(game) {
    if (game.ready_to_go) return;

    if (game._things_loaded >= game._total_things_to_load) {
        console.log("Ready");
        game.ready_to_go = true;
        game._on_ready();
    }
}

function _register_sfx(sfxdata, game) {
    for (let key in sfxdata) {
        let sfx_array = new Array(_SFX_ARRAY_SIZE);
        for (let i = 0; i < _SFX_ARRAY_SIZE; i++) {
            sfx_array[i] = new Audio(sfxdata[key].path);
            sfx_array[i].addEventListener('canplaythrough',
                _register_resource(sfxdata[key].path + '#' + (i+1), game), false);
            sfx_array[i].addEventListener('error',
                _sound_resource_error(sfxdata[key].path + '#' + (i+1), game), false, sfx_array[i]);
            if (sfxdata[key].hasOwnProperty('volume')) {
                sfx_array[i].volume = sfxdata[key].volume;
            }
        }
        game.sfx[key] = {
            _array: sfx_array,
            _index: 0,
            play: function() {
                if (!game.muted) {
                    this._array[this._index].currentTime = 0;
                    this._array[this._index].play();
                    this._index ++;
                    this._index = goodmod(this._index, _SFX_ARRAY_SIZE);
                }
            }
        }
    }
}

function _register_music(musicdata, game) {
    for (let key in musicdata) {
        let musicpath;
        if (_audiocheck.canPlayType('audio/mpeg')) {
            musicpath = musicdata[key].path + '.mp3';
        } else if (_audiocheck.canPlayType('audio/ogg')) {
            musicpath = musicdata[key].path + '.ogg';
        } else {
            console.log("No supported music type known :(");
            return;
        }
        let music = new Audio(musicpath);
        if (musicdata[key].hasOwnProperty('volume')) {
            music.volume = musicdata[key].volume;
        }

        if (!musicdata[key].hasOwnProperty('loop') || musicdata[key].loop) {
            /* We loop by default unless 'loop: false' is specified. */
            music.loop = true;
        }
        music.addEventListener('canplaythrough', _register_resource(musicpath, game), false);
        music.addEventListener('error', _sound_resource_error(musicpath, game, music), false);

        /* Handle music changes when muted, so when we unmute,
         * the correct music will be playing. */
        music._og_play = music.play;
        music.play = function() {
            if (game.muted) {
                music.was_playing = true;
            } else {
                music._og_play();
            }
        }

        music._og_pause = music.pause;
        music.pause = function() {
            if (game.muted) {
                music.was_playing = false;
            } else {
                music._og_pause();
            }
        }

        game.music[key] = music;
    }
}

function _register_images(imgdata, game) {
    function _recursive_load_images(pathmap) {
        let result = {};
        for (let key in pathmap) {
            if (typeof pathmap[key] === 'object') {
                result[key] = _recursive_load_images(pathmap[key]);
            } else {
                result[key] = new Image();
                result[key].onload = _register_resource(pathmap[key], game);
                result[key].src = pathmap[key];
            }
        }
        return result;
    }

    let loaded_imgs = _recursive_load_images(imgdata);
    for (let k in loaded_imgs) {
        game.img[k] = loaded_imgs[k];
    }
}

function create_game(params) {
    let game_props = {...params};

    game_props.frame_rate = params.frame_rate || 60;

    game_props.canvas_w = params.canvas_w || 640;
    game_props.canvas_h = params.canvas_h || 480;
    game_props.draw_scale = params.draw_scale || 4;
    game_props.top_border = params.top_border || 0;
    game_props.bottom_border = params.bottom_border || 8;
    game_props.left_border = params.left_border || 0;
    game_props.right_border = params.right_border || 0;

    game_props.tile_size = params.tile_size || 16;
    game_props.level_w = params.level_w || 10;
    game_props.level_h = params.level_h || 7;

    game_props.screen_w = game_props.canvas_w / game_props.draw_scale;
    game_props.screen_h = game_props.canvas_h / game_props.draw_scale;

    game_props.background_color = params.background_color || '#000000';

    let canvas = document.getElementById(game_props.canvas);

    let global_ctx = canvas.getContext('2d');
    global_ctx.imageSmoothingEnabled = false;
    global_ctx.webkitImageSmoothingEnabled = false;
    global_ctx.mozImageSmoothingEnabled = false;

    let mask_canvas = document.createElement('canvas');
    mask_canvas.width = canvas.width;
    mask_canvas.height = canvas.height;
    let mask_ctx = mask_canvas.getContext('2d');
    mask_ctx.imageSmoothingEnabled = false;
    mask_ctx.webkitImageSmoothingEnabled = false;
    mask_ctx.mozImageSmoothingEnabled = false;

    let copy_canvas = document.createElement('canvas');
    copy_canvas.width = canvas.width;
    copy_canvas.height = canvas.height;
    let copy_ctx = copy_canvas.getContext('2d');
    copy_ctx.imageSmoothingEnabled = false;
    copy_ctx.webkitImageSmoothingEnabled = false;
    copy_ctx.mozImageSmoothingEnabled = false;

    let draw_canvas = document.createElement('canvas');
    draw_canvas.width = canvas.width;
    draw_canvas.height = canvas.height;
    let draw_ctx = draw_canvas.getContext('2d');
    draw_ctx.imageSmoothingEnabled = false;
    draw_ctx.webkitImageSmoothingEnabled = false;
    draw_ctx.mozImageSmoothingEnabled = false;

    let game = {
        /* General properties */
        ...game_props,

        canvas: canvas,

        /* Loading */
        ready_to_go: false,
        _total_things_to_load: 1,
        _things_loaded: 0,
        resources_ready: function() {
            this._things_loaded ++;
            console.log("Finished enumerating resources to load. Things loaded:",
                this._things_loaded, "/", this._total_things_to_load);
            _check_if_loaded(this);
        },
        _on_ready: function() {
            this.ready_to_go = true;
            if (game.img._clicktostart && game.img._clicktostart.complete) {
                game.ctx.global.save();
                game.ctx.global.scale(game.draw_scale, game.draw_scale);
                game.ctx.global.drawImage(game.img._clicktostart, 0, 0);
                game.ctx.global.restore();
            }
        },
        playing: false,
        play: function() {
            this.playing = true;
            if (this.events.gamestart) {
                this.events.gamestart(this);
            }
            _loop(this);
        },
        _norun: false,

        /* Audio */
        sfx: {},
        music: {},
        muted: false,
        mute: function() {
            _mute(this);
        },
        unmute: function() {
            _unmute(this);
        },
        toggle_mute: function() {
            if (this.muted) {
                _unmute(this);
            } else {
                _mute(this);
            }
        },
        register_sfx: function(sfxdata) {
            _register_sfx(sfxdata, this);
        },
        register_music: function(musicdata) {
            _register_music(musicdata, this);
        },

        /* Drawing */
        ctx: {
            global: global_ctx, /* context for the actual real canvas */
            mask: mask_ctx,     /* context for drawing the transition mask, gets scaled up */
            copy: copy_ctx,     /* context for copying the old screen on transition */
            draw: draw_ctx,     /* context for drawing the real level */
        },
        img: {},
        register_images: function(imgdata) {
            _register_images(imgdata, this);
        },

        /* Transition system */
        transition: _transition,
        start_transition: function(type, length, callback, on_done) {
            _start_transition(this, type, length, callback, on_done);
        },
        long_transition: function(type, length, callback, on_done) {
            _long_transition(this, type, length, callback, on_done);
        }
    };

    /* Register event listeners */
    for (let ev in params.events) {
        /* Register any other events I guess */
        canvas['on' + ev] = function(e) {
            if (game.playing && !game._norun) {
                params.events[ev](game, e);
            }
        }
    }

    /* Override with special events */
    canvas.onmousedown = function(e) {
        if (!game._norun) {
            _handle_mousedown(game, e);
        }
    }

    canvas.onmousemove = function(e) {
        if (!game._norun) {
            _handle_mousemove(game, e);
        }
    }

    canvas.onmouseup = function(e) {
        if (!game._norun) {
            _handle_mouseup(game, e);
        }
    }

    canvas.onkeydown = function(e) {
        if (!game._norun && game.events.keydown) {
            console.log("E");
            game.events.keydown(game, e);
            e.preventDefault();
        }
    }

    canvas.onkeyup = function(e) {
        if (!game._norun && game.events.keyup) {
            game.events.keyup(game, e);
            e.preventDefault();
        }
    }

    canvas.onblur = function(e) {
        if (game.playing && !game.run_in_background) {
            game._norun = true;
            _stop_music(game);
        }
    }

    canvas.onfocus = function(e) {
        if (game.playing && !game.run_in_background) {
            game._norun = false;
            if (!game.muted) {
                _start_music(game);
            }
            _loop(game);
        }
    }

    /* Set loading stuff */
    let loading_img = new Image();
    loading_img.onload = _register_resource('loading.png', game, function() {
        if (!game.ready_to_go) {
            game.ctx.global.save();
            game.ctx.global.scale(game.draw_scale, game.draw_scale);
            game.ctx.global.drawImage(loading_img, 0, 0);
            game.ctx.global.restore();
        }
    });
    loading_img.src = 'loading.png';

    let clicktostart_img = new Image();
    clicktostart_img.onload = _register_resource('clicktostart.png', game, function() {
        if (game.ready_to_go) {
            game.ctx.global.save();
            game.ctx.global.scale(game.draw_scale, game.draw_scale);
            game.ctx.global.drawImage(game.img._clicktostart, 0, 0);
            game.ctx.global.restore();
        }
    });
    clicktostart_img.src = 'clicktostart.png';
    game.img._clicktostart = clicktostart_img;

    if (!game.run_in_background) {
        let pause_img = new Image();
        pause_img.onload = _register_resource('pause.png', game);
        pause_img.src = 'pause.png';
        game.img._pause = pause_img;
    }

    return game;
}

/* ---- Audio ---- */

function _stop_music(game) {
    if (game.muted) return;

    for (let m in game.music) {
        if (!game.music[m].paused) {
            game.music[m].was_playing = true;
            game.music[m].pause();
        } else {
            game.music[m].was_playing = false;
        }
    }
}

function _start_music(game, unmuting) {
    if (game.muted && !unmuting) return;

    for (let m in game.music) {
        if (game.music[m].was_playing) {
            game.music[m].play();
        }
    }
}

function _mute(game) {
    _stop_music(game);
    game.muted = true;
}

function _unmute(game) {
    game.muted = false;
    _start_music(game);
}

/* ---- Game update stuff ---- */

window.requestAnimFrame = (function() {
    return window.requestAnimationFrame      ||
        window.webkitRequestAnimationFrame   ||
        window.mozRequestAnimationFrame      ||
        window.oRequestAnimationFrame        ||
        window.msRequestAnimationFrame       ||
        function(callback, element) {
            window.setTimeout(callback, 1000/60);
        };
})();

let _last_frame_time;
let _timedelta = 0;
function _loop(game, timestamp) {
    if (timestamp == undefined) {
        timestamp = 0;
        _last_frame_time = timestamp;
    }
    _timedelta += timestamp - _last_frame_time;
    _last_frame_time = timestamp;

    while (_timedelta >= 1000 / game.frame_rate) {
        _update(game, 1000 / game.frame_rate);
        _timedelta -= 1000 / game.frame_rate;
    }
    _draw(game);

    if (!game._norun) {
        requestAnimFrame(function(timestamp) {
            _loop(game, timestamp);
        });
    }
}

function _update(game, delta) {
    game.update_func(delta);

    if (game.transition.is_transitioning) {
        game.transition.timer += delta;
        if (game.transition.timer > game.transition.end_time) {
            _finish_transition(game);
        }
    }
}

/* ---- Mouse ---- */

function _handle_mousedown(game, e) {
    if (!game.playing) return;

    if (game.transition.is_transitioning) return;

    const rect = game.canvas.getBoundingClientRect();
    let x = Math.floor((e.clientX - rect.left) / game.draw_scale);
    let y = Math.floor((e.clientY - rect.top) / game.draw_scale);
    if (e.button === 0 && game.events.mousedown) {
        game.events.mousedown(game, e, x, y);
    }
}

function _handle_mouseup(game, e) {
    if (!game.playing && game.ready_to_go) {
        /* Click to start */
        game.play();
        return;
    }

    if (game.transition.is_transitioning) return;

    const rect = game.canvas.getBoundingClientRect();
    let x = Math.floor((e.clientX - rect.left) / game.draw_scale);
    let y = Math.floor((e.clientY - rect.top) / game.draw_scale);
    if (e.button === 0 && game.events.mouseup) {
        game.events.mouseup(game, e, x, y);
    }
}

function _handle_mousemove(game, e) {
    const rect = game.canvas.getBoundingClientRect();
    let x = Math.floor((e.clientX - rect.left) / game.draw_scale);
    let y = Math.floor((e.clientY - rect.top) / game.draw_scale);
    if (game.events.mousemove) {
        game.events.mousemove(game, e, x, y);
    }
}

/* ---- Drawing stuff ---- */

function _draw(game) {
    let ctx = game.ctx.draw;

    ctx.save();

    ctx.fillStyle = game.background_color;

    ctx.beginPath();
    ctx.rect(0, 0, game.screen_w, game.screen_h);
    ctx.fill();

    game.draw_func(game.ctx.draw);

    if (game.transition.mid_long) {
        ctx.fillStyle = game.transition.color;
        ctx.fillRect(-1, -1, game.canvas_w + 5, game.canvas_h + 5);
    }

    ctx.restore();

    game.ctx.global.fillStyle = 'rgb(0, 0, 0)';
    game.ctx.global.beginPath();
    game.ctx.global.rect(0, 0, game.screen_w * game.draw_scale, game.screen_h * game.draw_scale);
    game.ctx.global.fill();

    game.ctx.global.save();

    game.ctx.global.scale(game.draw_scale, game.draw_scale);

    game.ctx.global.drawImage(ctx.canvas, 0, 0);

    if (game.transition.is_transitioning) {
        _draw_transition(game);
    }

    if (game._norun) {
        screen_draw(game.img._pause, 0, 0);
    }

    game.ctx.global.restore();
}

/* Draw a particular section of an image/spritesheet,
 * without having to do as much math or type the destination size */
function sprite_draw(ctx, img, section_w, section_h, section_x, section_y, dest_x, dest_y) {
    ctx.drawImage(img,
        section_w * section_x, section_h * section_y, section_w, section_h,
        dest_x, dest_y, section_w, section_h)
}

/* Draw an image over the whole screen lol */
function screen_draw(ctx, img) {
    ctx.drawImage(img, 0, 0);
}

/* ---- Transition stuff ---- */

let TransitionType = { DOTS: 1, SLIDE_DOWN: 2, SLIDE_UP: 3, FADE: 4, CIRCLE: 5 };

let _transition = {
    is_transitioning: false,
    timer: 0,
    color: '#000000',
    w: 20,
    h: 14,
    dir_invert_v: false,
    dir_invert_h: false,
    invert_shape: true,
    mid_long: false,
    done_func: null,
    type: TransitionType.DOTS,
    nodraw: false,
    end_time: 100,
}

function _long_transition(game, type, length, callback) {
    if (game.transition.is_transitioning) return;

    _draw(game);

    game.transition.invert_shape = false;
    _internal_start_transition(game, type, length, function() {
        game.transition.mid_long = true;
    }, function() {
        game.transition.invert_shape = true;
        game.transition.is_transitioning = true;
        let tdiv = game.transition.dir_invert_v;
        let tdih = game.transition.dir_invert_h;
        _internal_start_transition(game, type, length, function() {
            game.transition.mid_long = false;
            callback();
            game.transition.dir_invert_v = tdiv;
            game.transition.dir_invert_h = tdih;
        });
    });
}

function _start_transition(game, type, length, callback, on_done) {
    if (game.transition.is_transitioning) return;
    if (!game.transition.nodraw) _draw(game);

    _internal_start_transition(game, type, length, callback, on_done);
}

function _internal_start_transition(game, type, length, callback, on_done) {
    if (on_done) {
        game.transition.done_func = on_done;
    }

    game.transition.type = type;
    game.transition.end_time = length;

    game.ctx.copy.drawImage(game.ctx.draw.canvas, 0, 0);

    game.transition.dir_invert_v = Math.random() < 0.5;
    game.transition.dir_invert_h = Math.random() < 0.5;

    callback();

    game.transition.is_transitioning = true;
    game.transition.timer = 0;
}

function _finish_transition(game) {
    game.transition.is_transitioning = false;
    game.transition.timer = 0;

    if (game.transition.done_func) {
        setTimeout(function() {
            game.transition.done_func();
            game.transition.done_func = null;
        }, 400);
    }
}

function _draw_transition(game) {
    game.ctx.global.save();

    if (game.transition.type == TransitionType.DOTS) {
        game.ctx.mask.clearRect(0, 0, game.screen_w, game.screen_h);
        _draw_transition_dot_mask(game, game.ctx.mask);

        // Redraw to reduce antialiasing effects
        for (let i = 0; i < 5; i++) {
            game.ctx.mask.drawImage(game.ctx.mask.canvas, 0, 0);
        }

        game.ctx.mask.globalCompositeOperation = 'source-in';
        game.ctx.mask.drawImage(game.ctx.copy.canvas, 0, 0);
        game.ctx.mask.globalCompositeOperation = 'source-over';

        game.ctx.global.drawImage(game.ctx.mask.canvas, 0, 0);
    } else if (game.transition.type == TransitionType.SLIDE_DOWN) {
        let offset = game.transition.timer / game.transition.end_time * game.screen_h;

        game.ctx.global.drawImage(game.ctx.copy.canvas, 0, -offset);
        game.ctx.global.drawImage(ctx.canvas, 0, game.screen_h - offset);
    } else if (game.transition.type == TransitionType.SLIDE_UP) {
        let offset = game.transition.timer / game.transition.end_time * game.screen_h;

        game.ctx.global.drawImage(game.ctx.copy.canvas, 0, offset);
        game.ctx.global.drawImage(ctx.canvas, 0, - game.screen_h + offset);
    } else if (game.transition.type == TransitionType.FADE) {
        let alpha = 0;
        alpha = 1 - game.transition.timer / game.transition.end_time;

        game.ctx.mask.clearRect(0, 0, game.screen_w, game.screen_h);
        game.ctx.mask.fillStyle = 'rgba(255,255,255,' + alpha + ')';
        game.ctx.mask.fillRect(0, 0, game.screen_w, game.screen_h);
        game.ctx.mask.globalCompositeOperation = 'source-in';
        game.ctx.mask.drawImage(game.ctx.copy.canvas, 0, 0);
        game.ctx.mask.globalCompositeOperation = 'source-over';

        game.ctx.global.drawImage(game.ctx.mask.canvas, 0, 0);
    } else if (game.transition.type == TransitionType.CIRCLE) {
        game.ctx.mask.clearRect(0, 0, game.screen_w, game.screen_h);

        let frac = game.transition.timer / game.transition.end_time;
        if (!game.transition.invert_shape) {
            frac = 1 - frac;
        }
        frac = Math.pow(frac, 1.5);

        let cx = character.x + 0.5;
        let cy = character.y + 0.5;
        let lh = game.level_h + 1;
        let distances_to_corners = [
            Math.sqrt(Math.pow(cx * game.tile_size, 2) + Math.pow(cy * game.tile_size, 2)),
            Math.sqrt(Math.pow((game.level_w - cx) * game.tile_size, 2) + Math.pow(cy * game.tile_size, 2)),
            Math.sqrt(Math.pow(cx * game.tile_size, 2) + Math.pow((lh - cy) * game.tile_size, 2)),
            Math.sqrt(Math.pow((game.level_w - cx) * game.tile_size, 2) + Math.pow((lh - cy) * game.tile_size, 2)),
        ];
        let max_radius = Math.max(...distances_to_corners);
        let radius = frac * max_radius;

        game.ctx.mask.globalCompositeOperation = 'source-over';
        game.ctx.mask.drawImage(game.ctx.copy.canvas, 0, 0);

        game.ctx.mask.globalCompositeOperation = 'destination-out';
        game.ctx.mask.fillStyle = 'rgba(255,255,255)';
        game.ctx.mask.beginPath();
        if (!game.transition.invert_shape) {
            game.ctx.mask.rect(-5, -5, game.screen_w + 5, game.screen_h + 5);
        }
        game.ctx.mask.arc(character.x * game.tile_size + game.tile_size / 2,
            character.y * game.tile_size + game.tile_size / 2,
            radius, 0, 2 * Math.PI,
            !game.transition.invert_shape);
        game.ctx.mask.fill();

        game.ctx.mask.globalCompositeOperation = 'source-over';

        game.ctx.global.drawImage(game.ctx.mask.canvas, 0, 0);
    }

    game.ctx.global.restore();
}

function _draw_transition_dot_mask(game, ctx) {
    ctx.fillStyle = '#0000ff';
    let cell_width = game.screen_w / game.transition.w;
    let cell_height = game.screen_h / game.transition.h;
    let max_radius = 0.75 * Math.max(cell_width, cell_height);

    let transition_dot_length = game.transition.end_time * 3 / 8;

    for (let x = -1; x < game.transition.w + 1; x++) {
        for (let y = -1; y < game.transition.h + 1; y++) {
            let radius;

            let circle_start_time = (x + y) / (game.transition.w + game.transition.h)
                    * (game.transition.end_time - transition_dot_length);
            if (game.transition.timer - circle_start_time < 0) {
                if (game.transition.invert_shape) {
                    radius = 0;
                } else {
                    radius = max_radius;
                }
            } else if (game.transition.timer - circle_start_time < transition_dot_length) {
                if (game.transition.invert_shape) {
                    radius = (game.transition.timer - circle_start_time) / transition_dot_length * max_radius;
                } else {
                    radius = (1 - (game.transition.timer - circle_start_time) / transition_dot_length) * max_radius;
                }
            } else {
                if (game.transition.invert_shape) {
                    radius = max_radius;
                } else {
                    radius = 0;
                }
            }

            let draw_x = x;
            let draw_y = y;
            if (game.transition.dir_invert_v) draw_x = game.transition.w - 1 - x;
            if (game.transition.dir_invert_h) draw_y = game.transition.h - 1 - y;

            if (radius >= max_radius * 0.8) {
                if (!game.transition.invert_shape) {
                    ctx.fillRect(draw_x * cell_width, draw_y * cell_width, cell_width + 1, cell_width + 1);
                }
            } else if (radius > 0) {
                ctx.save();
                ctx.beginPath();
                if (game.transition.invert_shape) {
                    ctx.rect(draw_x * cell_width, draw_y * cell_width, cell_width + 3, cell_width + 3);
                }
                ctx.moveTo(draw_x * cell_width + cell_width / 2, draw_y * cell_width + cell_width / 2);
                ctx.arc(draw_x * cell_width + cell_width / 2,
                         draw_y * cell_width + cell_width / 2,
                         radius, 0, 2 * Math.PI, game.transition.invert_shape);
                ctx.clip();
                ctx.fillRect(draw_x * cell_width, draw_y * cell_width, cell_width, cell_width);
                ctx.restore();
            } else {
                if (game.transition.invert_shape) {
                    ctx.fillRect(draw_x * cell_width, draw_y * cell_width, cell_width + 3, cell_width + 3);
                }
            }
        }
    }
}

/* ---- former contents of ready.js ---- */

// Due to Timo Huovinen
// https://stackoverflow.com/questions/799981/document-ready-equivalent-without-jquery
var ready = (function(){

    var readyList,
        DOMContentLoaded,
        class2type = {};
        class2type["[object Boolean]"] = "boolean";
        class2type["[object Number]"] = "number";
        class2type["[object String]"] = "string";
        class2type["[object Function]"] = "function";
        class2type["[object Array]"] = "array";
        class2type["[object Date]"] = "date";
        class2type["[object RegExp]"] = "regexp";
        class2type["[object Object]"] = "object";

    var ReadyObj = {
        // Is the DOM ready to be used? Set to true once it occurs.
        isReady: false,
        // A counter to track how many items to wait for before
        // the ready event fires. See #6781
        readyWait: 1,
        // Hold (or release) the ready event
        holdReady: function( hold ) {
            if ( hold ) {
                ReadyObj.readyWait++;
            } else {
                ReadyObj.ready( true );
            }
        },
        // Handle when the DOM is ready
        ready: function( wait ) {
            // Either a released hold or an DOMready/load event and not yet ready
            if ( (wait === true && !--ReadyObj.readyWait) || (wait !== true && !ReadyObj.isReady) ) {
                // Make sure body exists, at least, in case IE gets a little overzealous (ticket #5443).
                if ( !document.body ) {
                    return setTimeout( ReadyObj.ready, 1 );
                }

                // Remember that the DOM is ready
                ReadyObj.isReady = true;
                // If a normal DOM Ready event fired, decrement, and wait if need be
                if ( wait !== true && --ReadyObj.readyWait > 0 ) {
                    return;
                }
                // If there are functions bound, to execute
                readyList.resolveWith( document, [ ReadyObj ] );

                // Trigger any bound ready events
                //if ( ReadyObj.fn.trigger ) {
                //    ReadyObj( document ).trigger( "ready" ).unbind( "ready" );
                //}
            }
        },
        bindReady: function() {
            if ( readyList ) {
                return;
            }
            readyList = ReadyObj._Deferred();

            // Catch cases where $(document).ready() is called after the
            // browser event has already occurred.
            if ( document.readyState === "complete" ) {
                // Handle it asynchronously to allow scripts the opportunity to delay ready
                return setTimeout( ReadyObj.ready, 1 );
            }

            // Mozilla, Opera and webkit nightlies currently support this event
            if ( document.addEventListener ) {
                // Use the handy event callback
                document.addEventListener( "DOMContentLoaded", DOMContentLoaded, false );
                // A fallback to window.onload, that will always work
                window.addEventListener( "load", ReadyObj.ready, false );

            // If IE event model is used
            } else if ( document.attachEvent ) {
                // ensure firing before onload,
                // maybe late but safe also for iframes
                document.attachEvent( "onreadystatechange", DOMContentLoaded );

                // A fallback to window.onload, that will always work
                window.attachEvent( "onload", ReadyObj.ready );

                // If IE and not a frame
                // continually check to see if the document is ready
                var toplevel = false;

                try {
                    toplevel = window.frameElement == null;
                } catch(e) {}

                if ( document.documentElement.doScroll && toplevel ) {
                    doScrollCheck();
                }
            }
        },
        _Deferred: function() {
            var // callbacks list
                callbacks = [],
                // stored [ context , args ]
                fired,
                // to avoid firing when already doing so
                firing,
                // flag to know if the deferred has been cancelled
                cancelled,
                // the deferred itself
                deferred  = {

                    // done( f1, f2, ...)
                    done: function() {
                        if ( !cancelled ) {
                            var args = arguments,
                                i,
                                length,
                                elem,
                                type,
                                _fired;
                            if ( fired ) {
                                _fired = fired;
                                fired = 0;
                            }
                            for ( i = 0, length = args.length; i < length; i++ ) {
                                elem = args[ i ];
                                type = ReadyObj.type( elem );
                                if ( type === "array" ) {
                                    deferred.done.apply( deferred, elem );
                                } else if ( type === "function" ) {
                                    callbacks.push( elem );
                                }
                            }
                            if ( _fired ) {
                                deferred.resolveWith( _fired[ 0 ], _fired[ 1 ] );
                            }
                        }
                        return this;
                    },

                    // resolve with given context and args
                    resolveWith: function( context, args ) {
                        if ( !cancelled && !fired && !firing ) {
                            // make sure args are available (#8421)
                            args = args || [];
                            firing = 1;
                            try {
                                while( callbacks[ 0 ] ) {
                                    callbacks.shift().apply( context, args );//shifts a callback, and applies it to document
                                }
                            }
                            finally {
                                fired = [ context, args ];
                                firing = 0;
                            }
                        }
                        return this;
                    },

                    // resolve with this as context and given arguments
                    resolve: function() {
                        deferred.resolveWith( this, arguments );
                        return this;
                    },

                    // Has this deferred been resolved?
                    isResolved: function() {
                        return !!( firing || fired );
                    },

                    // Cancel
                    cancel: function() {
                        cancelled = 1;
                        callbacks = [];
                        return this;
                    }
                };

            return deferred;
        },
        type: function( obj ) {
            return obj == null ?
                String( obj ) :
                class2type[ Object.prototype.toString.call(obj) ] || "object";
        }
    }
    // The DOM ready check for Internet Explorer
    function doScrollCheck() {
        if ( ReadyObj.isReady ) {
            return;
        }

        try {
            // If IE is used, use the trick by Diego Perini
            // http://javascript.nwbox.com/IEContentLoaded/
            document.documentElement.doScroll("left");
        } catch(e) {
            setTimeout( doScrollCheck, 1 );
            return;
        }

        // and execute any waiting functions
        ReadyObj.ready();
    }
    // Cleanup functions for the document ready method
    if ( document.addEventListener ) {
        DOMContentLoaded = function() {
            document.removeEventListener( "DOMContentLoaded", DOMContentLoaded, false );
            ReadyObj.ready();
        };

    } else if ( document.attachEvent ) {
        DOMContentLoaded = function() {
            // Make sure body exists, at least, in case IE gets a little overzealous (ticket #5443).
            if ( document.readyState === "complete" ) {
                document.detachEvent( "onreadystatechange", DOMContentLoaded );
                ReadyObj.ready();
            }
        };
    }
    function ready( fn ) {
        // Attach the listeners
        ReadyObj.bindReady();

        var type = ReadyObj.type( fn );

        // Add the callback
        readyList.done( fn );//readyList is result of _Deferred()
    }
    return ready;
})();
