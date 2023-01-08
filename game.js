"use strict";

let game_started = false;

let level_number = 1;

/* state:
 * STAND: waiting for input
 * DRAG: dragging a path out for the tree
 * GROW: growing branch
 * WIN: level complete
 */
let State = { STAND: 0, DRAG: 1, GROW: 2, WIN: 3 };

let game_state = State.STAND;

let in_title;

let wonitall = false;

let started = false;

let showundohelp = true;

let tutorialized = true;
let tutorial_screen = 0;
let show_tutorial_text = true;
let saw_level5_text_early = false;
let tutomap = [{ x:  3 , y:  0 , id:  1 }, { x:  4 , y:  0 , id:  1 }, { x:  0 , y:  1 , id:  3 }, { x:  1 , y:  1 , id:  3 }, { x:  2 , y:  1 , id:  3 }, { x:  3 , y:  1 , id:  1 }, { x:  0 , y:  2 , id:  3 }, { x:  1 , y:  2 , id:  2 }, { x:  2 , y:  2 , id:  2 }, { x:  3 , y:  2 , id:  1 }, { x:  0 , y:  3 , id:  3 }, { x:  3 , y:  3 , id:  1 }, { x:  4 , y:  3 , id:  0 }, { x:  0 , y:  4 , id:  3 }, { x:  3 , y:  4 , id:  1 }, { x:  4 , y:  4 , id:  0 }, { x:  1 , y:  5 , id:  0 }, { x:  2 , y:  5 , id:  0 }, { x:  3 , y:  5 , id:  0 }, { x:  4 , y:  5 , id:  0 } ]

let game;

let save_data = 1;
const SAVE_KEY = "casso.squirrelativity.save";

ready(function() {
    in_title = true;
    wonitall = false;

    game = create_game({
        canvas: 'canvas',
        canvas_w: 640,
        canvas_h: 720,
        draw_scale: 4,
        tile_size: 8,
        level_w: 20,
        level_h: 14,
        bottom_border: 8,
        //background_color: '#45B7FF',
        background_color: '#71C1DE',
        draw_func: do_draw,
        update_func: do_update,
        run_in_background: true,
        events: {
            mousedown: handle_mousedown,
            mouseup: handle_mouseup,
            mousemove: handle_mousemove,
            keyup: handle_keyup,
            gamestart: handle_gamestart,
        },
    });

    game.register_sfx({
        pop: {
            path: 'pop.wav',
            volume: 0.15,
        },
        bwip: {
            path: 'bwip.wav',
            volume: 0.6,
        },
        complete: {
            path: 'complete.wav',
            volume: 0.4,
        },
    });

    game.register_images({
        grids: 'grids.png',
        branches: 'branches.png',
        branches2: 'branches2.png',
        fruits: 'fruits.png',
        scorefruit: 'scorefruit.png',
        objs: 'objs.png',
        topsquirrel: 'foursquirrel.png',
        botsquirrel: 'foursquirrel2.png',
        sittingsquirrels: 'sittingsquirrels.png',
        anger: 'anger.png',
        complete: 'complete.png',
        leaves: 'leaves.png',
        buttons: 'buttons.png',
        level_titles: 'level_titles.png',
        undoresethelp: 'undoresethelp.png',
        tutorial: {
            1: 'tutorial1.png',
            3: 'tutorial3.png',
            5: 'tutorial5.png',
        },
        eschidetuto: 'eschidetuto.png',
        title: 'title.png',
        winner: 'winner.png',
        flower: 'flower.png',
    });

    game.register_music({
        patter: {
            path: 'patter.wav',
            volume: 0.25,
        },
        tree: {
            path: 'tree.wav',
            volume: 0.25,
        },
        ambience: {
            path: 'ambience',
            volume: 0.25,
        },
    });

    game.resources_ready();

    save_data = parseInt(localStorage.getItem(SAVE_KEY)) || 1;
    level_number = save_data;
    if (level_number > 1) {
        showundohelp = false;
    }

    buttons = [
        {
            id: 0,
            x: BUTTON_SPACING + 1,
            y: game.screen_h - BUTTON_SIZE - BUTTON_SPACING,
            clickfunc: undo,
        },
        {
            id: 1,
            x: BUTTON_SIZE + BUTTON_SPACING * 2 + 1,
            y: game.screen_h - BUTTON_SIZE - BUTTON_SPACING,
            clickfunc: reset,
        },
    ];

    load_level();
});

function delete_save() {
    try {
        localStorage.setItem(SAVE_KEY, 1);
    } catch (e) {
        console.error("oops, can't save! though that uh... doesn't matter here");
    }
}

function save() {
    try {
        if (!levels.hasOwnProperty(level_number + 1)) {
            console.log("am at end");
            localStorage.setItem(SAVE_KEY, 1);
        } else {
            localStorage.setItem(SAVE_KEY, level_number + 1);
        }
    } catch (e) {
        console.error("oops, can't save!");
    }
}

let level_dimension = 8;

let grid_sprite_size = 16;

let topscore = 0;
let botscore = 0;

let ID = {
};

let treeID = {
    lefttip: 0,
    leftbranch: 1,
    righttip: 2,
    rightbranch: 3,
    lefttoright: 4,
    righttoleft: 5,
    rightbranchplusleft: 6,
    leftbranchplusright: 7,
    leftcornerplusleft: 8,
    rightcornerplusright: 9,
    treebase: 10,
    baseplusleft: 11,
    baseplusright: 12,
    leftbaseplusright: 13,
    rightbaseplusleft: 14,
};

/* This info is used for determining what type of leaves to give the branch */

/* tree parts that exit via the top left */
let pointlefttree = {
    [treeID.leftbranch]: 1,
    [treeID.righttoleft]: 1,
    [treeID.rightbranchplusleft]: 1,
    [treeID.leftbranchplusright]: 1,
    [treeID.leftcornerplusleft]: 1,
    [treeID.rightcornerplusright]: 1,
    [treeID.baseplusleft]: 1,
    [treeID.leftbaseplusright]: 1,
    [treeID.rightbaseplusleft]: 1,
};

/* tree parts that exit via the top right */
let pointrighttree = {
    [treeID.rightbranch]: 1,
    [treeID.lefttoright]: 1,
    [treeID.rightbranchplusleft]: 1,
    [treeID.leftbranchplusright]: 1,
    [treeID.leftcornerplusleft]: 1,
    [treeID.rightcornerplusright]: 1,
    [treeID.baseplusright]: 1,
    [treeID.leftbaseplusright]: 1,
    [treeID.rightbaseplusleft]: 1,
};

/* tree parts that 'enter from the left side' on the bottom */
let enterlefttree = {
    [treeID.righttip]: 1,
    [treeID.rightbranch]: 1,
    [treeID.lefttoright]: 1,
    [treeID.rightbranchplusleft]: 1,
    [treeID.rightcornerplusright]: 1,
};

/* tree parts that 'enter from the right side' on the bottom */
let enterrighttree = {
    [treeID.lefttip]: 1,
    [treeID.leftbranch]: 1,
    [treeID.righttoleft]: 1,
    [treeID.leftbranchplusright]: 1,
    [treeID.leftcornerplusleft]: 1,
};

/* End of leaf info */

/* The abstract objects that appear in the grid */

let objID = {
    token: 0,
    box: 1,
    upleftblock: 2,
    downleftblock: 3,
    leftsideblock: 4,
};

/* same as "no going down right from" */
let no_going_upleft_into = {
    [objID.box]: true,
};

/* same as "no going down right into" */
let no_going_upleft_from = {
    [objID.upleftblock]: true,
    [objID.leftsideblock]: true,
    [objID.box]: true,
};

/* same as "no going up right from" */
let no_going_downleft_into = {
    [objID.box]: true,
};

/* same as "no going up right into" */
let no_going_downleft_from = {
    [objID.downleftblock]: true,
    [objID.leftsideblock]: true,
    [objID.box]: true,
};

/* Fruit */

let fruitID = {
    botfruit: 0,
    topfruit: 1,
};

const BRANCH_MAX_FRAME = 3;

let Type = { BOTTREE: 0, TOPTREE: 1, FRUIT: 2, OTHER: 3 };

let objs = [];

let fruits = [];

let leaves = [];

let flowers = [];

let squirrels = [];
let topsquirrel_queue = [];
let botsquirrel_queue = [];
let topsquirrel_status = [ false, false ];
let botsquirrel_status = [ false, false ];
let last_topsquirrel = 0;
let last_botsquirrel = 1;
let topsquirrel_angry = false;
let botsquirrel_angry = false;

let drag_path = [];
let grow_path = [];

let drag_type = null;

const BUTTON_SIZE = 14;
const BUTTON_SPACING = 3;

let buttons;

function handle_gamestart(game) {
    console.log("Game start!");
    game.music.ambience.play();
}

function tree_at(x, y) {
    return objs.filter(o => o.x === x && o.y === y && (o.type === Type.TOPTREE || o.type === Type.BOTTREE));
}

function objs_at(x, y) {
    return objs.filter(o => o.x === x && o.y === y && o.type !== Type.TOPTREE && o.type !== Type.BOTTREE);
}

function fruits_at(x, y) {
    return fruits.filter(o => o.x === x && o.y === y && !o.picked);
}

function unclaimed_fruits_at(x, y) {
    return fruits_at(x, y).filter(o => !o.squirreled);
}

function token_at(x, y) {
    return objs.filter(o => o.x === x && o.y === y && o.type === Type.OTHER && o.id === objID.token);
}

function grid_square_for(x, y) {
    let center_x = Math.floor(game.screen_w / 2);
    let center_y = Math.floor(game.screen_h / 2);

    let zero_x = center_x - (level_dimension * grid_sprite_size / 2)
    let zero_y = center_y - grid_sprite_size / 2;

    let click_x = x, click_y = y;

    let grid_x = Math.floor((click_x - zero_x - click_y + zero_y) / grid_sprite_size + 0.5);
    let grid_y = Math.floor((click_x - zero_x + click_y - zero_y) / grid_sprite_size - 0.5);

    return [grid_x, grid_y];
}

function coords_for_grid(x, y) {
    let center_x = Math.floor(game.screen_w / 2);
    let center_y = Math.floor(game.screen_h / 2);

    let zero_x = center_x - (level_dimension * grid_sprite_size / 2)
    let zero_y = center_y - grid_sprite_size / 2;

    let coord_x = zero_x + x * grid_sprite_size / 2 + y * grid_sprite_size / 2;
    let coord_y = zero_y + y * grid_sprite_size / 2 - x * grid_sprite_size / 2;

    return [coord_x, coord_y];
}

function handle_mousedown(game, e, x, y) {
    if (game.transition.is_transitioning) return;

    if (in_title) {
        game.long_transition(TransitionType.FADE, 1000, function() {
            level_number = save_data;
            load_level();
            in_title = false;
        });
        return;
    }

    for (let b of buttons) {
        if (b.hovered) {
            b.isdown = true;
            b.clickfunc();
            return;
        }
    }

    if (won) {
        game.start_transition(TransitionType.FADE, 500, function() {
            level_number ++;
            load_level();
        });
        return;
    }

    let [gx, gy] = grid_square_for(x, y);

    if (gx < 0 || gx >= level_dimension || gy < 0 || gy >= level_dimension) return;

    if (game_state === State.STAND) {
        /* We have to select a tree part, but one that has some empty space in one direction above it */
        let there = tree_at(gx, gy);
        let neighbors1, neighbors2;

        if (there[0].type === Type.BOTTREE) {
            neighbors1 = tree_at(gx + 1, gy);
            neighbors2 = tree_at(gx, gy - 1);
        } else {
            neighbors1 = tree_at(gx - 1, gy);
            neighbors2 = tree_at(gx, gy + 1);
        }

        if (there.length > 0 && (neighbors1.length === 0 || neighbors2.length === 0)) {
            game_state = State.DRAG;
            drag_path.push({ x: gx, y: gy });
            drag_type = there[0].type;
        }
    }
}

function handle_mousemove(game, e, x, y) {
    let hovering_a_button = false;
    for (let b of buttons) {
        if (x >= b.x && x < b.x + BUTTON_SIZE && y >= b.y && y < b.y + BUTTON_SIZE) {
            b.hovered = true;
            hovering_a_button = true;
        } else {
            b.hovered = false;
        }
    }
    if (hovering_a_button) return;

    let [gx, gy] = grid_square_for(x, y);

    if (game_state === State.DRAG) {
        if (gx < 0 || gx >= level_dimension || gy < 0 || gy >= level_dimension) return;

        let deleting = false;
        for (let d of drag_path) {
            /* if we move mouse to an earlier part of the path, retract back to there */
            if (deleting) {
                d.del = true;
            }
            if (d.x === gx && d.y === gy) {
                deleting = true;
            }
        }

        drag_path = drag_path.filter(d => !d.del);

        if (deleting) return;

        /* Only extend drag path (for bottom tree) if it's exactly one 'up' from the Last Drag */
        /* and if it's extending into free space */
        let ld = drag_path[drag_path.length - 1];
        let ok_this_space = false;
        if (drag_type === Type.BOTTREE) {
            ok_this_space = gx == ld.x + 1 && gy == ld.y || gx == ld.x && gy == ld.y - 1;
        } else if (drag_type === Type.TOPTREE) {
            ok_this_space = gx == ld.x - 1 && gy == ld.y || gx == ld.x && gy == ld.y + 1;
        }
        if (ok_this_space) {
            /* Now check if we are not blocked by an object */
            let objs_in_target = objs_at(gx, gy);
            let objs_in_current = objs_at(ld.x, ld.y);
            let drag_blocked = false;

            let dh = 0; /* 'horizontal drag' */
            let dv = 0; /* 'vertical drag' */

            if (drag_type === Type.BOTTREE) {
                /* Dragging up */
                if (gx == ld.x + 1) {
                    /* up/right */
                    dh = 1;
                    dv = -1;
                } else if (gy == ld.y - 1) {
                    /* up/left */
                    dh = -1;
                    dv = -1;
                }
            } else {
                /* Dragging down */
                if (gy == ld.y + 1) {
                    /* down/right */
                    dh = 1;
                    dv = 1;
                } else if (gx == ld.x - 1) {
                    /* down/left */
                    dh = -1;
                    dv = 1;
                }
            }

            for (let o of objs_in_target) {
                /* Check if blocked by target */
                if (dh < 0 && dv < 0 && no_going_upleft_into[o.id]) {
                    drag_blocked = true;
                }
                if (dh < 0 && dv > 0 && no_going_downleft_into[o.id]) {
                    drag_blocked = true;
                }
                if (dh > 0 && dv < 0 && no_going_downleft_from[o.id]) {
                    /* "no going downleft from" = "no going upright into" */
                    drag_blocked = true;
                }
                if (dh > 0 && dv > 0 && no_going_upleft_from[o.id]) {
                    /* "no going upleft from" = "no going downright into" */
                    drag_blocked = true;
                }
            }

            for (let o of objs_in_current) {
                /* Check if blocked by current square */
                if (dh < 0 && dv < 0 && no_going_upleft_from[o.id]) {
                    drag_blocked = true;
                }
                if (dh < 0 && dv > 0 && no_going_downleft_from[o.id]) {
                    drag_blocked = true;
                }
                if (dh > 0 && dv < 0 && no_going_downleft_into[o.id]) {
                    /* "no going downleft into" = "no going upright from" */
                    drag_blocked = true;
                }
                if (dh > 0 && dv > 0 && no_going_upleft_into[o.id]) {
                    /* "no going upleft into" = "no going downright from" */
                    drag_blocked = true;
                }
            }

            if (tutorialized && level_number === 1) {
                /* Only can drag into designated squares if tutorial on lvl 1 */
                let tuto = tutomap.filter(m => m.x === gx && m.y === gy && m.id === tutorial_screen);
                if (tuto.length === 0) {
                    drag_blocked = true;
                }
            }

            if (!drag_blocked) {
                let occupying = tree_at(gx, gy);
                if (level_number === 1) {
                    console.log("!!");
                    show_tutorial_text = false;
                }
                if (occupying.length === 0) {
                    drag_path.push({ x: gx, y: gy });
                }
            }
        }
    }
}

function handle_mouseup(game, e, x, y) {
    for (let b of buttons) {
        b.isdown = false;
    }

    if (game.transition.is_transitioning) return;

    if (game_state === State.DRAG) {
        if (drag_path.length > 1) {
            grow_path = drag_path;
            game_state = State.GROW;
        } else {
            grow_path = [];
            game_state = State.STAND;
        }
        drag_path = [];
    }
}

let undo_stack = [];

function copy_list(list) {
    let newlist = [];
    for (let x of list) {
        newlist.push(x);
    }
    return newlist;
}

function copy_flat_objlist(list) {
    let newlist = [];
    for (let x of list) {
        newlist.push({ ...x });
    }
    return newlist;
}

function create_undo_point() {
    let undo_point = {
        topscore: topscore,
        botscore: botscore,
        objs: copy_flat_objlist(objs),
        fruits: copy_flat_objlist(fruits),
        leaves: copy_flat_objlist(leaves),
        last_topsquirrel: last_topsquirrel,
        last_botsquirrel: last_botsquirrel,
        topsquirrel_angry: topsquirrel_angry,
        botsquirrel_angry: botsquirrel_angry,
        tutorial_screen: tutorial_screen,
        show_tutorial_text: show_tutorial_text,
    }

    for (let f of undo_point.fruits) {
        if (f.squirreled && !f.picked) {
            /* If a squirrel was about to get it, when we undo,
             * act like they already got it. */
            f.picked = true;
            if (f.id === fruitID.topfruit) {
                undo_point.botscore ++;
            } else if (f.id === fruitID.botfruit) {
                undo_point.topscore ++;
            }
        }
    }

    for (let s of squirrels) {
        /* If a squirrel is CURRENTLY TAKING A FRUIT BACK, count that as well */
        if (s.has_fruit) {
            if (s.type === Type.BOTTREE) {
                undo_point.botscore ++;
            } else if (s.type === Type.TOPTREE) {
                undo_point.topscore ++;
            }
        }
    }

    undo_stack.push(undo_point);
}

function undo() {
    showundohelp = false;

    if (undo_stack.length === 0) return;

    game.music.patter.pause();
    game.music.tree.pause();

    grow_state = {
        extending_from: null,
        next_square: null,
        current_tip: null,
        type: null,
        growing_to_next: false,
        timer: 0,
    };

    let state = undo_stack.pop();

    topscore = state.topscore;
    botscore = state.botscore;
    objs = state.objs;
    fruits = state.fruits;
    leaves = state.leaves;
    last_topsquirrel = state.last_topsquirrel;
    last_botsquirrel = state.last_botsquirrel;
    topsquirrel_angry = state.topsquirrel_angry;
    botsquirrel_angry = state.botsquirrel_angry;

    tutorial_screen = state.tutorial_screen;
    show_tutorial_text = state.show_tutorial_text;

    squirrels = [];
    topsquirrel_queue = [];
    botsquirrel_queue = [];
    topsquirrel_status = [ false, false ];
    botsquirrel_status = [ false, false ];

    drag_path = [];
    grow_path = [];

    drag_type = null;

    won = false;
    game_state = State.STAND;
}

function reset() {
    game.start_transition(TransitionType.FADE, 500, function() {
        showundohelp = false;
        load_level();
        game_state = State.STAND;
    });
}

let won = false;

let complete_opacity = 0;
const COMPLETE_FADEIN_TIME = 2;

function win() {
    won = true;
    game_state = State.WIN;
    game.sfx.complete.play();
    complete_opacity = 0;
    save();
}

function win_everything() {
    console.log("omg you won!");
    game.long_transition(TransitionType.FADE, 1000, function() {
        wonitall = true;
    });
}

function load_level() {
    if (level_number > Object.keys(levels).length) {
        win_everything();
    } else {
        load_level_data(levels[level_number]);
    }
}

function load_level_data(lvl) {
    won = false;

    undo_stack = [];

    game.music.patter.pause();
    game.music.tree.pause();

    game_state = State.STAND;

    topscore = 0;
    botscore = 0;

    objs = [];
    fruits = [];
    squirrels = [];
    leaves = [];
    flowers = [];

    objs = [];

    fruits = [];

    squirrels = [];
    topsquirrel_queue = [];
    botsquirrel_queue = [];
    topsquirrel_status = [ false, false ];
    botsquirrel_status = [ false, false ];
    last_topsquirrel = 0;
    last_botsquirrel = 1;
    topsquirrel_angry = false;
    botsquirrel_angry = false;

    grow_path = [];
    grow_state = {
        extending_from: null,
        next_square: null,
        current_tip: null,
        type: null,
        growing_to_next: false, /* if true, we are growing towards the next square; if not, we are growing the new tip */
        timer: 0,
    };

    drag_path = [];
    drag_type = null;

    tutorial_screen = 0;
    if (level_number > 1) {
        show_tutorial_text = true;
        tutorialized = true;
    }

    for (let l of lvl.map) {
        console.log("LOAD", l);
        objs.push({ type: Type.OTHER, frame: 0, ...l });
    }

    level_dimension = lvl.dimension;

    objs.sort((a, b) => {
        return (b.x - b.y) - (a.x - a.y);
    });

    let bottreebase = { type: Type.BOTTREE, id: treeID.treebase, x: 0, y: level_dimension - 1, parentbranch: null, frame: BRANCH_MAX_FRAME, distance: 0 };
    objs.push(bottreebase);

    let toptreebase = { type: Type.TOPTREE, id: treeID.treebase, x: level_dimension - 1, y: 0, parentbranch: null, frame: BRANCH_MAX_FRAME, distance: 0 };
    objs.push(toptreebase);
}

function extend_left(treetype) {
    switch (treetype) {
        case treeID.lefttip: return treeID.leftbranch;
        case treeID.righttip: return treeID.righttoleft;
        case treeID.rightbranch: return treeID.rightbranchplusleft;
        case treeID.lefttoright: return treeID.leftcornerplusleft;
        case treeID.treebase: return treeID.baseplusleft;
        case treeID.baseplusright: return treeID.rightbaseplusleft;

        /* These ones can't happen */
        default: console.error("don't know how to extend", treetype, "to the left"); break;
    }
}

function extend_right(treetype) {
    switch (treetype) {
        case treeID.righttip: return treeID.rightbranch;
        case treeID.lefttip: return treeID.lefttoright;
        case treeID.leftbranch: return treeID.leftbranchplusright;
        case treeID.righttoleft: return treeID.rightcornerplusright;
        case treeID.treebase: return treeID.baseplusright;
        case treeID.baseplusleft: return treeID.leftbaseplusright;

        /* These ones can't happen */
        default: console.error("don't know how to extend", treetype, "to the right"); break;
    }
}

const LeafType = {
    DOWNRIGHT: 0,
    DOWNLEFT: 1,
    UPRIGHT: 2,
    UPLEFT: 3,
}

const LEAF_DELAY = 200;

function create_leaf(treetype, leaftype, x, y) {
    leaves.push({
        treetype: treetype,
        id: leaftype,
        x: x,
        y: y,
        timer: 0,
        frame: 0,
        delay: LEAF_DELAY,
    });

    if ((leaftype === LeafType.DOWNRIGHT || leaftype === LeafType.DOWNLEFT) && Math.random() < 0.5) {
        /* random chance of being a sleeper cell for a flower as well */
        let angle = Math.random() * 2 * Math.PI;
        let magnitude = Math.random() * 4 + 1;
        flowers.push({
            x: x,
            y: y,
            xoffset: Math.cos(angle) * magnitude,
            yoffset: Math.sin(angle) * magnitude,
            timer: 0,
            frame: 0,
            delay: Math.random() * 500 + 100,
            speed: Math.random() * 0.5 + 0.5,
        });
    }
}

function create_fruit(treetype, x, y) {
    let new_fruit;
    if (treetype === Type.BOTTREE) {
        new_fruit = {
            id: fruitID.botfruit,
            x: x - 1,
            y: y + 1,
            frame: 0,
            timer: 0,
        };
    } else if (treetype === Type.TOPTREE) {
        new_fruit = {
            id: fruitID.topfruit,
            x: x + 1,
            y: y - 1,
            frame: 0,
            timer: 0,
        };
    }

    fruits.push(new_fruit);
    game.sfx.bwip.play();

    let tree_here = tree_at(new_fruit.x, new_fruit.y);
    if (tree_here.length > 0) {
        let tree = tree_here[0];
        console.log(treetype, tree.type);
        if (treetype !== tree.type) { // lol
            create_squirrel(new_fruit.x, new_fruit.y);
            new_fruit.squirreled = true;
        }
    }
}

function create_squirrel(target_x, target_y) {
    /* Pathfinding */
    let tree_there = tree_at(target_x, target_y);
    if (tree_there.length === 0) {
        console.error("Squirrel can only go to somewhere there is a branch");
        return;
    }
    let tree = tree_there[0];

    /* decide which squirrel will go get it */
    let sqstatus;
    let last_sq;
    let which_sq;
    let enqueue = false;
    let squirrel_queue;
    if (tree.type === Type.TOPTREE) {
        sqstatus = topsquirrel_status;
        last_sq = last_topsquirrel;
        squirrel_queue = topsquirrel_queue;
    } else {
        sqstatus = botsquirrel_status;
        last_sq = last_botsquirrel;
        squirrel_queue = botsquirrel_queue;
    }

    if (!sqstatus[0] && !sqstatus[1]) {
        /* Neither is busy, so use whichever one didn't go last */
        if (last_sq == 1) {
            which_sq = 0;
        } else {
            which_sq = 1;
        }
        if (tree.type === Type.TOPTREE) {
            last_topsquirrel = which_sq;
        } else {
            last_botsquirrel = which_sq;
        }
    } else if (!sqstatus[0]) {
        /* squirrel 0 is ready */
        which_sq = 0;
    } else if (!sqstatus[1]) {
        /* squirrel 1 is ready */
        which_sq = 1;
    } else {
        /* Both squirrels are busy, so add this one to the queue */
        enqueue = true;
    }

    if (!enqueue) {
        sqstatus[which_sq] = true;

        if (game.music.patter.paused) {
            game.music.patter.play();
        }

        let start;
        if (tree.type === Type.TOPTREE) {
            if (which_sq === 0) {
                start = {
                    x: level_dimension - 1,
                    y: -1,
                    dx: 0,
                    dy: 1,
                };
            } else {
                start = {
                    x: level_dimension,
                    y: 0,
                    dx: -1,
                    dy: 0,
                };
            }
        } else {
            if (which_sq === 0) {
                start = {
                    x: -1.8,
                    y: level_dimension - 1,
                    dx: 1,
                    dy: 0,
                };
            } else {
                start = {
                    x: 0,
                    y: level_dimension + 0.8,
                    dx: 0,
                    dy: -1,
                };
            }
        }

        let path = [ tree ];
        let looktree = tree;
        while (looktree.parentbranch) {
            path.push(looktree.parentbranch);
            looktree = looktree.parentbranch;
        }

        let [screen_x, screen_y] = coords_for_grid(start.x, start.y);

        squirrels.push({
            type: tree.type,
            which: which_sq,
            ...start,
            scx: screen_x,
            scy: screen_y,
            path: path,
            backpath: [ start ],
            going_back: false,
            frame: 0,
            timer: 0,
        });
    } else {
        /* The squirrels are busy right now, but they'll get to it! */
        squirrel_queue.push({
            x: target_x,
            y: target_y,
        });
    }
}

function squirrels_not_busy() {
    return !topsquirrel_status[0] && !topsquirrel_status[1] && !botsquirrel_status[0] && !botsquirrel_status[1];
}

function check_victory() {
    /* Called to check if we've won the level */
    botsquirrel_angry = false;
    topsquirrel_angry = false;

    /* If squirrels are still running around we can't win */
    if (!squirrels_not_busy()) return;

    /* If there are still tokens in the level we can't win */
    let tokens = objs.filter(o => o.type === Type.OTHER && o.id === objID.token);
    if (tokens.length > 0) return;

    /* If there are still fruits uncollected we can't win */
    let outfruits = fruits.filter(f => !f.picked);
    if (outfruits.length > 0) return;

    /* If all fruits are collected but the division is unequal, squirrels get mad */
    if (topscore > botscore) {
        botsquirrel_angry = true;
    } else if (topscore < botscore) {
        topsquirrel_angry = true;
    } else {
        /* WIN */
        win();
    }
}

/* MAIN UPDATE FUNCTION */
function do_update(delta) {
    let seconds = delta / 1000;

    if (level_number < 5 && (topsquirrel_angry || botsquirrel_angry)) {
        saw_level5_text_early = true;
    }

    update_fruits(delta);

    update_squirrels(delta);

    update_leaves(delta);

    update_flowers(delta);

    if (won) {
        complete_opacity += seconds / COMPLETE_FADEIN_TIME;
        if (complete_opacity >= 1) {
            complete_opacity = 1;
        }
    }

    if (squirrels_not_busy()) {
        /* Stop pattering if no squirrels are getting stuff */
        game.music.patter.pause();
    }

    if (game_state === State.GROW) {
        do_grow(delta);
    }
}

let GROW_FRAME_LENGTH = 20;

let grow_state;

function do_grow(delta) {
    if (grow_state.extending_from === null) {
        /* We're at the beginning of a move; the player just did something. So back up our state. */
        create_undo_point();

        /* Grow path always starts on an existing tree component. */
        console.log("grow start!");
        grow_state.extending_from = tree_at(grow_path[0].x, grow_path[0].y)[0];
        grow_state.extending_from.frame = BRANCH_MAX_FRAME;
        grow_state.type = grow_state.extending_from.type;
        grow_path.shift();
        game.music.tree.play();
    } else {
        grow_state.timer += delta;
        while (grow_state.timer >= GROW_FRAME_LENGTH) {
            grow_state.extending_from.frame ++;
            grow_state.timer -= GROW_FRAME_LENGTH;

            if (grow_state.extending_from.frame > BRANCH_MAX_FRAME) {
                grow_state.extending_from.frame = BRANCH_MAX_FRAME;
                if (!grow_state.growing_to_next) {
                    /* This means we just finished growing the tip so find what direction we go next */

                    /* Check if we collected a little fruit token here */
                    let tokens = token_at(grow_state.extending_from.x, grow_state.extending_from.y)
                    if (tokens.length > 0) {
                        /* If we did, remove the token and create a fruit */
                        tokens[0].deletethis = true;
                        objs = objs.filter(o => !o.deletethis);
                        create_fruit(grow_state.type, grow_state.extending_from.x, grow_state.extending_from.y);
                    }

                    /* Check if we grew to a fruit, and send a squirrel to get it if so */
                    let fruits_here = unclaimed_fruits_at(grow_state.extending_from.x, grow_state.extending_from.y);
                    if (fruits_here.length > 0) {
                        let fruit = fruits_here[0];
                        if (fruit.id === fruitID.botfruit && grow_state.type === Type.TOPTREE
                                || fruit.id === fruitID.topfruit && grow_state.type === Type.BOTTREE) {
                            create_squirrel(grow_state.extending_from.x, grow_state.extending_from.y);
                            fruit.squirreled = true;
                        }
                    }

                    if (grow_path.length > 0) {
                        grow_state.next_square = grow_path.shift();
                        if (grow_state.type === Type.BOTTREE) {
                            if (grow_state.next_square.x > grow_state.extending_from.x) {
                                /* a greater X-value means extending rightward */
                                grow_state.extending_from.id = extend_right(grow_state.extending_from.id);
                            } else {
                                /* otherwise we must be going to the left */
                                grow_state.extending_from.id = extend_left(grow_state.extending_from.id);
                            }
                        } else {
                            if (grow_state.next_square.x < grow_state.extending_from.x) {
                                /* a lesser X-value means extending rightward (upside down) */
                                grow_state.extending_from.id = extend_right(grow_state.extending_from.id);
                            } else {
                                /* otherwise we must be going to the left */
                                grow_state.extending_from.id = extend_left(grow_state.extending_from.id);
                            }
                        }
                        grow_state.extending_from.frame = 1; /* frame 0 is always the same as the preexisting thing so skip it */
                        grow_state.growing_to_next = true;
                    } else {
                        /* no more places to go, we're done! */
                        game_state = State.STAND;
                        grow_state.extending_from = null;
                        grow_state.next_square = null;
                        grow_state.timer = 0;
                        game.music.tree.pause();

                        /* on level 1, if tutorial active, advance to the next tuto screen */
                        if (level_number === 1 && tutorialized) {
                            /* check if any tuto map for the current tuto screen is uncovered */
                            let current_tutos = tutomap.filter(t => t.id === tutorial_screen);
                            let can_go_next = true;
                            for (let t of current_tutos) {
                                let tree_there = tree_at(t.x, t.y);
                                if (tree_there.length === 0) {
                                    /* Oh no! We missed a square. Don't show the next screen yet. */
                                    can_go_next = false;
                                }
                            }
                            if (can_go_next) {
                                tutorial_screen ++;
                                show_tutorial_text = true;
                            }
                        }
                    }
                } else {
                    /* Create a leaf in the part we came from (if the tree is long enough) */
                    if (grow_state.extending_from.distance + 0.5 >= level_dimension / 3) {
                        if (pointlefttree[grow_state.extending_from.id]) {
                            /* if previous thing extended to the left, add a top-left-leaf */
                            create_leaf(grow_state.type, LeafType.UPLEFT, grow_state.extending_from.x, grow_state.extending_from.y);
                        } else if (pointrighttree[grow_state.extending_from.id]) {
                            /* same but for right */
                            create_leaf(grow_state.type, LeafType.UPRIGHT, grow_state.extending_from.x, grow_state.extending_from.y);
                        }
                    }

                    /* Grow a new tip in the next_square */
                    let tipid;
                    let parentbranch = grow_state.extending_from;
                    if (grow_state.type === Type.BOTTREE) {
                        if (grow_state.next_square.x > grow_state.extending_from.x) {
                            /* a greater X-value means extending rightward */
                            tipid = treeID.righttip;
                        } else {
                            /* otherwise we must be going to the left */
                            tipid = treeID.lefttip;
                        }
                    } else {
                        if (grow_state.next_square.x < grow_state.extending_from.x) {
                            /* a lesser X-value means extending rightward (upside down) */
                            tipid = treeID.righttip;
                        } else {
                            /* otherwise we must be going to the left */
                            tipid = treeID.lefttip;
                        }
                    }
                    grow_state.extending_from = {
                        type: grow_state.type,
                        id: tipid,
                        x: grow_state.next_square.x,
                        y: grow_state.next_square.y,
                        parentbranch: parentbranch,
                        distance: parentbranch.distance + 1,
                        frame: 0
                    };
                    objs.push(grow_state.extending_from);
                    grow_state.growing_to_next = false;

                    if (grow_state.extending_from.distance >= level_dimension / 3) {
                        if (tipid === treeID.lefttip) {
                            /* left tip, counterintuitively, gets leaves on the bottom right */
                            create_leaf(grow_state.type, LeafType.DOWNRIGHT, grow_state.extending_from.x, grow_state.extending_from.y);
                        } else if (tipid === treeID.righttip) {
                            /* opposite */
                            create_leaf(grow_state.type, LeafType.DOWNLEFT, grow_state.extending_from.x, grow_state.extending_from.y);
                        }
                    }
                }
            }
        }
    }
}

const NUM_LEAF_FRAMES = 4;
const LEAF_FRAME_LENGTH = 120;

function update_leaves(delta) {
    for (let l of leaves) {
        if (l.delay > 0) {
            /* delay before leaves appear */
            l.delay -= delta;
            continue;
        } else {
            l.delay = 0;
        }

        if (l.frame < NUM_LEAF_FRAMES - 1) {
            l.timer += delta;
            while (l.timer >= LEAF_FRAME_LENGTH) {
                l.frame ++;
                l.timer -= LEAF_FRAME_LENGTH;
                if (l.frame >= NUM_LEAF_FRAMES - 1) {
                    l.frame = NUM_LEAF_FRAMES - 1;
                    break;
                }
            }
        }
    }
}

const NUM_FLOWER_FRAMES = 6;
const FLOWER_FRAME_LENGTH = 200;

function update_flowers(delta) {
    if (!won) {
        return;
    }

    for (let f of flowers) {
        if (f.delay > 0) {
            /* delay before flowers appear */
            f.delay -= delta;
            continue;
        } else {
            f.delay = 0;
        }

        if (f.frame < NUM_FLOWER_FRAMES - 1) {
            f.timer += delta;
            while (f.timer >= FLOWER_FRAME_LENGTH / f.speed) {
                f.frame ++;
                f.timer -= FLOWER_FRAME_LENGTH / f.speed;
                if (f.frame >= NUM_FLOWER_FRAMES - 1) {
                    f.frame = NUM_FLOWER_FRAMES - 1;
                    break;
                }
            }
        }
    }
}

const FRUIT_FRAME_LENGTH = 100;
const NUM_FRUIT_FRAMES = 6;

function update_fruits(delta) {
    for (let f of fruits) {
        if (f.frame < NUM_FRUIT_FRAMES - 1) {
            f.timer += delta;
            while (f.timer >= FRUIT_FRAME_LENGTH) {
                f.frame ++;
                f.timer -= FRUIT_FRAME_LENGTH;
                if (f.frame >= NUM_FRUIT_FRAMES - 1) {
                    f.frame = NUM_FRUIT_FRAMES - 1;
                    break;
                }
            }
        }
    }
}

const SQUIRREL_FRAME_LENGTH = 80;
const SQUIRREL_NFRAMES = 4;
const SQUIRREL_SPEED = 6;

function update_squirrels(delta) {
    let seconds = delta / 1000;

    for (let s of squirrels) {
        s.x += s.dx * SQUIRREL_SPEED * seconds;
        s.y += s.dy * SQUIRREL_SPEED * seconds;
        s.timer += delta;

        while (s.timer >= SQUIRREL_FRAME_LENGTH) {
            s.timer -= SQUIRREL_FRAME_LENGTH;
            s.frame ++;
            s.frame = goodmod(s.frame, SQUIRREL_NFRAMES);
            [s.scx, s.scy] = coords_for_grid(s.x, s.y);
        }

        /* Figure out if we reached the current path component. If we have,
         * look at the next one and change directions accordingly */
        let path_component = s.path[s.path.length - 1];
        /* Sort of a "dot product" */
        if (s.x * s.dx > path_component.x * s.dx || s.y * s.dy > path_component.y * s.dy) {
            s.x = path_component.x;
            s.y = path_component.y;
            /* Move this component into the backwards path */
            s.backpath.push(s.path.pop());
            if (s.path.length > 0) {
                /* Decide what direction to go next */
                let newpc = s.path[s.path.length - 1];
                let olddx = s.dx, olddy = s.dy;
                if (newpc.x > s.x) {
                    s.dx = 1;
                    s.dy = 0;
                } else if (newpc.x < s.x) {
                    s.dx = -1;
                    s.dy = 0;
                } else if (newpc.y > s.y) {
                    s.dx = 0;
                    s.dy = 1;
                } else if (newpc.y < s.y) {
                    s.dx = 0;
                    s.dy = -1;
                }
                if (olddx != s.dx || olddy != s.dy) {
                    game.sfx.pop.play();
                }
            } else if (!s.going_back) {
                /* Reached the end of the path! Now reverse along the back path */
                [s.path, s.backpath] = [s.backpath, s.path];
                s.going_back = true;

                /* Check if there's a fruit here and if there is then pick it */
                let fruits = fruits_at(s.x, s.y);
                if (fruits.length > 0) {
                    /* but only eat it if it's the opposite type from us */
                    if (fruits[0].type !== s.type) {
                        fruits[0].picked = true;
                        s.has_fruit = true;
                    }
                }
            } else {
                /* We finished, so delete the squirrel :( */
                s.done = true;
                if (s.has_fruit) {
                    /* TODO make another sfx for this */
                    game.sfx.pop.play();
                }

                if (s.type === Type.TOPTREE) {
                    if (s.has_fruit) {
                        topscore ++;
                    }
                    topsquirrel_status[s.which] = false;

                    /* If they are still planning on getting more fruits, do it again */
                    if (topsquirrel_queue.length > 0) {
                        let next = topsquirrel_queue.shift();
                        create_squirrel(next.x, next.y);
                    } else {
                        check_victory();
                    }
                } else {
                    if (s.has_fruit) {
                        botscore ++;
                    }
                    botsquirrel_status[s.which] = false;

                    /* Same */
                    if (botsquirrel_queue.length > 0) {
                        let next = botsquirrel_queue.shift();
                        create_squirrel(next.x, next.y);
                    } else {
                        check_victory();
                    }
                }
            }
        }
    }

    squirrels = squirrels.filter(s => !s.done);

    squirrels.sort((a, b) => {
        if (a.dy === 0 || b.dy === 0) {
            return b.x - a.x;
        } else {
            return b.y - a.y;
        }
    });
}

function do_draw(ctx) {
    ctx.fillStyle = game.background_color;

    ctx.beginPath();
    ctx.rect(0, 0, game.screen_w, game.screen_h);
    ctx.fill();

    if (in_title) {
        screen_draw(ctx, game.img.title);
        return;
    }

    if (wonitall) {
        screen_draw(ctx, game.img.winner);
        return;
    }

    draw_grid(ctx);

    draw_tree(ctx);

    draw_objs(ctx);

    draw_leaves(ctx);

    draw_fruits(ctx);

    draw_flowers(ctx);

    draw_tutorial(ctx);

    draw_squirrels(ctx);

    draw_drag_path(ctx);

    draw_score(ctx);

    draw_buttons(ctx);

    draw_title(ctx);

    if (won) {
        ctx.save();
        ctx.globalAlpha = complete_opacity;
        screen_draw(ctx, game.img.complete);
        ctx.restore();
    }

    if (showundohelp) {
        screen_draw(ctx, game.img.undoresethelp);
    }
}

function draw_grid(ctx) {
    for (let x = 0; x <= level_dimension; x++) {
        for (let y = 0; y <= level_dimension; y++) {
            let [coord_x, coord_y] = coords_for_grid(x, y);

            if (x == level_dimension && y == level_dimension) {
                sprite_draw(ctx, game.img.grids, grid_sprite_size, grid_sprite_size, 3, 0, coord_x, coord_y);
            } else if (y == level_dimension) {
                sprite_draw(ctx, game.img.grids, grid_sprite_size, grid_sprite_size, 2, 0, coord_x, coord_y);
            } else if (x == level_dimension) {
                sprite_draw(ctx, game.img.grids, grid_sprite_size, grid_sprite_size, 1, 0, coord_x, coord_y);
            } else {
                sprite_draw(ctx, game.img.grids, grid_sprite_size, grid_sprite_size, 0, 0, coord_x, coord_y);
            }
        }
    }
}

function draw_tree(ctx) {
    for (let o of objs) {
        let [coord_x, coord_y] = coords_for_grid(o.x, o.y);

        if (o.type === Type.TOPTREE) {
            sprite_draw(ctx, game.img.branches2, grid_sprite_size, grid_sprite_size, o.id, o.frame, coord_x, coord_y);
        } else if (o.type === Type.BOTTREE) {
            sprite_draw(ctx, game.img.branches, grid_sprite_size, grid_sprite_size, o.id, o.frame, coord_x, coord_y);
        }
    }
}

function draw_leaves(ctx) {
    leaves.sort((a, b) => {
        return (b.x - b.y) - (a.x - a.y);
    });

    for (let l of leaves) {
        let [coord_x, coord_y] = coords_for_grid(l.x, l.y);

        if (l.delay === 0) {
            let leaf_id = l.id;
            if (l.treetype === Type.TOPTREE) {
                leaf_id += 4;
            }

            sprite_draw(ctx, game.img.leaves, grid_sprite_size, grid_sprite_size, leaf_id, l.frame, coord_x, coord_y);
        }
    }
}

function draw_flowers(ctx) {
    if (!won) return;

    flowers.sort((a, b) => {
        return (b.x - b.y) - (a.x - a.y);
    });

    for (let f of flowers) {
        let [coord_x, coord_y] = coords_for_grid(f.x, f.y);

        if (f.delay === 0) {
            sprite_draw(ctx, game.img.flower, grid_sprite_size, grid_sprite_size, 0, f.frame, coord_x + f.xoffset, coord_y + f.yoffset);
        }
    }
}

const OBJ_WIDTH = 24;
const OBJ_HEIGHT = 24;
function draw_objs(ctx) {
    let xoffset = (OBJ_WIDTH - grid_sprite_size) / 2;
    let yoffset = (OBJ_HEIGHT - grid_sprite_size) / 2;

    for (let o of objs) {
        let [coord_x, coord_y] = coords_for_grid(o.x, o.y);

        if (o.type !== Type.TOPTREE && o.type !== Type.BOTTREE) {
            sprite_draw(ctx, game.img.objs, OBJ_WIDTH, OBJ_HEIGHT, o.id, o.frame, coord_x - xoffset, coord_y - yoffset);
        }
    }
}

function draw_fruits(ctx) {
    for (let f of fruits) {
        let [coord_x, coord_y] = coords_for_grid(f.x, f.y);

        let yoffset = 0;
        if (f.id === 0) {
            yoffset = - grid_sprite_size;
        }

        let frame = f.frame;
        if (f.picked) {
            frame = NUM_FRUIT_FRAMES;
        }

        sprite_draw(ctx, game.img.fruits, grid_sprite_size, grid_sprite_size * 2, f.id, frame, coord_x, coord_y + yoffset);
    }
}

const SCOREFRUIT_WIDTH = 11;
const SCOREFRUIT_HEIGHT = 12;
function draw_score(ctx) {
    let center_x = Math.floor(game.screen_w / 2);
    let center_y = Math.floor(game.screen_h / 2);

    let top_y = center_y - (level_dimension * grid_sprite_size / 2) - SCOREFRUIT_HEIGHT - 10;
    let bottom_y = center_y + (level_dimension * grid_sprite_size / 2) + 10;

    let top_start_x = center_x - SCOREFRUIT_WIDTH * topscore / 2
    for (let i = 0; i < topscore; i++) {
        sprite_draw(ctx, game.img.scorefruit, SCOREFRUIT_WIDTH, SCOREFRUIT_HEIGHT, 0, 0, top_start_x + i * SCOREFRUIT_WIDTH, top_y);
    }

    let bot_start_x = center_x - SCOREFRUIT_WIDTH * botscore / 2
    for (let i = 0; i < botscore; i++) {
        sprite_draw(ctx, game.img.scorefruit, SCOREFRUIT_WIDTH, SCOREFRUIT_HEIGHT, 1, 0, bot_start_x + i * SCOREFRUIT_WIDTH, bottom_y);
    }
}

const SQUIRREL_HEIGHT = 20;
const SITSQ_WIDTH = 16;
const SITSQ_HEIGHT = 16;
const SQSPACE = 6;
const SQVSPACE = 2;
function draw_squirrels(ctx) {
    for (let s of squirrels) {
        let dir;
        if (s.dx < 0) {
            dir = 0;
        } else if (s.dy > 0) {
            dir = 1;
        } else if (s.dy < 0) {
            dir = 2;
        } else {
            dir = 3;
        }

        if (s.has_fruit) {
            dir += 4;
        }

        let img, yoffset;
        if (s.type === Type.TOPTREE) {
            img = game.img.topsquirrel;
            //yoffset = grid_sprite_size - SQUIRREL_HEIGHT + 10;
            yoffset = grid_sprite_size - SQUIRREL_HEIGHT - 3;
        } else {
            img = game.img.botsquirrel;
            yoffset = grid_sprite_size - SQUIRREL_HEIGHT - 3;
        }
        sprite_draw(ctx, img, grid_sprite_size * 3, SQUIRREL_HEIGHT, dir, s.frame, s.scx - grid_sprite_size, s.scy + yoffset);
    }

    if (!topsquirrel_status[0]) {
        let [sx, sy] = coords_for_grid(level_dimension - 1, -1);
        sprite_draw(ctx, game.img.sittingsquirrels, SITSQ_WIDTH, SITSQ_HEIGHT, 0, 0, sx - SQSPACE, sy - SQVSPACE - 2);
    }

    if (!topsquirrel_status[1]) {
        let [sx, sy] = coords_for_grid(level_dimension, 0);
        sprite_draw(ctx, game.img.sittingsquirrels, SITSQ_WIDTH, SITSQ_HEIGHT, 1, 0, sx + SQSPACE, sy - SQVSPACE - 2);

        if (topsquirrel_angry) {
            sprite_draw(ctx, game.img.anger, 16, 16, 0, 0, sx + 15, sy - 12);
        }
    }

    if (!botsquirrel_status[0]) {
        let [sx, sy] = coords_for_grid(-1, level_dimension - 1);
        sprite_draw(ctx, game.img.sittingsquirrels, SITSQ_WIDTH, SITSQ_HEIGHT, 2, 0, sx - SQSPACE, sy + SQVSPACE);
    }

    if (!botsquirrel_status[1]) {
        let [sx, sy] = coords_for_grid(0, level_dimension);
        sprite_draw(ctx, game.img.sittingsquirrels, SITSQ_WIDTH, SITSQ_HEIGHT, 3, 0, sx + SQSPACE, sy + SQVSPACE);

        if (botsquirrel_angry) {
            sprite_draw(ctx, game.img.anger, 16, 16, 0, 0, sx + 15, sy - 10);
        }
    }
}

function draw_drag_path(ctx) {
    for (let d of drag_path) {
        let [coord_x, coord_y] = coords_for_grid(d.x, d.y);

        sprite_draw(ctx, game.img.grids, grid_sprite_size, grid_sprite_size, 4, 0, coord_x, coord_y);
    }
}

function draw_buttons(ctx) {
    for (let b of buttons) {
        let variant = 0;
        if (b.hovered) variant = 1;
        if (b.isdown) variant = 2;

        sprite_draw(ctx, game.img.buttons, BUTTON_SIZE, BUTTON_SIZE, b.id, variant, b.x, b.y);
    }
}

function draw_tutorial(ctx) {
    if (tutorialized || level_number !== 1) {
        if (game.img.tutorial.hasOwnProperty(level_number)) {
            if (show_tutorial_text && (level_number !== 5 || !saw_level5_text_early)) {
                sprite_draw(ctx, game.img.tutorial[level_number], 160, 180, 0, tutorial_screen, 0, 0);
            }
            if (level_number === 1 && game_state !== State.WIN) {
                screen_draw(ctx, game.img.eschidetuto);
            }
            if (level_number < 5 && (topsquirrel_angry || botsquirrel_angry)) {
                /* if they discover Squirrel Anger early, show clarificatory text */
                screen_draw(ctx, game.img.tutorial[5]);
            }
        }
    }
}

function draw_title(ctx) {
    sprite_draw(ctx, game.img.level_titles, 160, 6, 0, level_number - 1, 0, 4);
}

let x_pressed = false;
function handle_keyup(game, e) {
    switch (e.keyCode) {
        case 27:
            /* ESC */
            console.log("omg");
            tutorialized = false;
            showundohelp = false;
            e.preventDefault();
            break;
        case 77:
            /* M */
            game.toggle_mute();
            e.preventDefault();
            break;
        case 82:
            reset();
            e.preventDefault();
            break;
        case 90:
            undo();
            e.preventDefault();
            break;
        case 88:
            x_pressed = true;
            break;
        case 87:
            if (x_pressed) {
                delete_save();
                e.preventDefault();
            }
            break;
    }

    if (e.keyCode !== 88) {
        /* non-X key */
        x_pressed = false;
    }

}
