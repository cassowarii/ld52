"use strict";

let game_started = false;

let won = false;

let level_number = 1;

/* state:
 * STAND: waiting for input
 * DRAG: dragging a path out for the tree
 * GROW: growing branch
 */
let State = { STAND: 0, DRAG: 1, GROW: 2 };

let game_state = State.STAND;

let started = false;

let save_data = 1;

let game;

ready(function() {
    game = create_game({
        canvas: 'canvas',
        canvas_w: 640,
        canvas_h: 640,
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
            gamestart: handle_gamestart,
        },
    });

    game.register_sfx({
    });

    game.register_images({
        grids: 'grids.png',
        branches: 'branches.png',
        branches2: 'branches2.png',
        fruits: 'fruits.png',
        objs: 'objs.png',
    });

    game.register_music({
    });

    game.resources_ready();

    save_data = localStorage.getItem("casso.renewmysubscription.save") || 1;
});

let level_dimension = 8;

let grid_sprite_size = 16;

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
};

let objID = {
    fruitcollect: 0,
};

let fruitID = {
    botfruit: 0,
    topfruit: 1,
};

const BRANCH_MAX_FRAME = 3;

let Type = { BOTTREE: 0, TOPTREE: 1, FRUIT: 2, OTHER: 3 };

let objs = [
    { type: Type.BOTTREE, id: treeID.treebase, x: 0, y: level_dimension - 1, frame: BRANCH_MAX_FRAME },
    { type: Type.BOTTREE, id: treeID.lefttip, x: 0, y: level_dimension - 2, frame: BRANCH_MAX_FRAME },
    { type: Type.BOTTREE, id: treeID.righttip, x: 1, y: level_dimension - 1, frame: BRANCH_MAX_FRAME },

    { type: Type.TOPTREE, id: treeID.treebase, x: level_dimension - 1, y: 0, frame: BRANCH_MAX_FRAME },
    { type: Type.TOPTREE, id: treeID.lefttip, x: level_dimension - 1, y: 1, frame: BRANCH_MAX_FRAME },
    { type: Type.TOPTREE, id: treeID.righttip, x: level_dimension - 2, y: 0, frame: BRANCH_MAX_FRAME },

    { type: Type.OTHER, id: objID.fruitcollect, x: level_dimension / 2, y: level_dimension / 2, frame: 0 },
    { type: Type.OTHER, id: objID.fruitcollect, x: level_dimension / 2 - 1, y: level_dimension / 2, frame: 0 },
];

let fruits = [];

let drag_path = [];
let grow_path = [];

let drag_type = null;

function handle_gamestart(game) {
    console.log("Game start!");
}

function tree_at(x, y) {
    return objs.filter(o => o.x === x && o.y === y && (o.type === Type.TOPTREE || o.type === Type.BOTTREE));
}

function fruits_at(x, y) {
    return fruits.filter(o => o.x === x && o.y === y);
}

function fruitcollect_at(x, y) {
    return objs.filter(o => o.x === x && o.y === y && o.type === Type.OTHER && o.id === objID.fruitcollect);
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
    let [gx, gy] = grid_square_for(x, y);

    console.log(game_state);
    if (game_state === State.DRAG) {
        if (gx < 0 || gx >= level_dimension || gy < 0 || gy >= level_dimension) return;
        if (drag_path.filter(d => d.x === gx && d.y === gy).length > 0) return;

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
            let occupying = tree_at(gx, gy);
            if (occupying.length === 0) {
                drag_path.push({ x: gx, y: gy });
            }
        }
    }
}

function handle_mouseup(game, e, x, y) {
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

function reset() {
    load_level();
    game_state = State.STAND;
}

function win() {
    console.log("omg you won!!");
}

function load_level() {
    if (level_number > levels.length) {
        win();
    } else {
        load_level_data(levels[level_number]);
    }
}

function load_level_data(lvl) {
}

function extend_left(treetype) {
    switch (treetype) {
        case treeID.lefttip: return treeID.leftbranch;
        case treeID.righttip: return treeID.righttoleft;
        case treeID.rightbranch: return treeID.rightbranchplusleft;
        case treeID.lefttoright: return treeID.leftcornerplusleft;

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

        /* These ones can't happen */
        default: console.error("don't know how to extend", treetype, "to the right"); break;
    }
}

let GROW_FRAME_LENGTH = 20;

let grow_state = {
    extending_from: null,
    next_square: null,
    current_tip: null,
    type: null,
    growing_to_next: false, /* if true, we are growing towards the next square; if not, we are growing the new tip */
    timer: 0,
};

function create_fruit(treetype, x, y) {
    if (treetype === Type.BOTTREE) {
        fruits.push({
            id: fruitID.botfruit,
            x: x - 1,
            y: y + 1,
            frame: 0,
            timer: 0,
        });
    } else if (treetype === Type.TOPTREE) {
        fruits.push({
            id: fruitID.topfruit,
            x: x + 1,
            y: y - 1,
            frame: 0,
            timer: 0,
        });
    }
}

function do_update(delta) {
    let seconds = delta / 1000;

    update_fruits(delta);

    if (game_state === State.GROW) {
        if (grow_state.extending_from === null) {
            /* Grow path always starts on an existing tree component. */
            console.log("grow start!");
            grow_state.extending_from = tree_at(grow_path[0].x, grow_path[0].y)[0];
            grow_state.extending_from.frame = BRANCH_MAX_FRAME;
            grow_state.type = grow_state.extending_from.type;
            grow_path.shift();
        }

        if (grow_state.extending_from != null) {
            grow_state.timer += delta;
            while (grow_state.timer >= GROW_FRAME_LENGTH) {
                grow_state.extending_from.frame ++;
                grow_state.timer -= GROW_FRAME_LENGTH;
                console.log(grow_state.extending_from.x, grow_state.extending_from.y, grow_state.extending_from.frame);

                if (grow_state.extending_from.frame > BRANCH_MAX_FRAME) {
                    grow_state.extending_from.frame = BRANCH_MAX_FRAME;
                    if (!grow_state.growing_to_next) {
                        /* This means we just finished growing the tip so find what direction we go next */

                        /* Check if we collected a little fruit token here */
                        let tokens = fruitcollect_at(grow_state.extending_from.x, grow_state.extending_from.y)
                        if (tokens.length > 0) {
                            /* If we did, remove the token and create a fruit */
                            tokens[0].deletethis = true;
                            objs = objs.filter(o => !o.deletethis);
                            create_fruit(grow_state.type, grow_state.extending_from.x, grow_state.extending_from.y);
                        }

                        if (grow_path.length > 0) {
                            console.log("ach");
                            grow_state.next_square = grow_path.shift();
                            /* TODO this needs to account for Upside Down Tree */
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
                            console.log("done!");
                            grow_state.extending_from = null;
                            grow_state.next_square = null;
                            grow_state.timer = 0;
                        }
                    } else {
                        /* Grow a new tip in the next_square */
                        /* TODO this needs to account for Upside Down Tree */
                        let tipid;
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
                        grow_state.extending_from = { type: grow_state.type, id: tipid, x: grow_state.next_square.x, y: grow_state.next_square.y, frame: 0 };
                        objs.push(grow_state.extending_from);
                        grow_state.growing_to_next = false;
                    }
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

function do_draw(ctx) {
    ctx.fillStyle = game.background_color;

    ctx.beginPath();
    ctx.rect(0, 0, game.screen_w, game.screen_h);
    ctx.fill();

    draw_grid(ctx);

    draw_objs(ctx);

    draw_fruits(ctx);

    draw_drag_path(ctx);
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

function draw_objs(ctx) {
    for (let i = 0; i < objs.length; i++) {
        let o = objs[i];

        let [coord_x, coord_y] = coords_for_grid(o.x, o.y);

        if (o.type === Type.TOPTREE) {
            sprite_draw(ctx, game.img.branches2, grid_sprite_size, grid_sprite_size, o.id, o.frame, coord_x, coord_y);
        } else if (o.type === Type.BOTTREE) {
            sprite_draw(ctx, game.img.branches, grid_sprite_size, grid_sprite_size, o.id, o.frame, coord_x, coord_y);
        } else {
            sprite_draw(ctx, game.img.objs, grid_sprite_size, grid_sprite_size, o.id, o.frame, coord_x, coord_y);
        }
    }
}

function draw_fruits(ctx) {
    for (let f of fruits) {
        console.log("draw fruit: ", f);
        let [coord_x, coord_y] = coords_for_grid(f.x, f.y);

        let yoffset = 0;
        if (f.id === 0) {
            yoffset = - grid_sprite_size;
        }
        sprite_draw(ctx, game.img.fruits, grid_sprite_size, grid_sprite_size * 2, f.id, f.frame, coord_x, coord_y + yoffset);
    }
}

function draw_drag_path(ctx) {
    for (let i = 0; i < drag_path.length; i++) {
        let d = drag_path[i];

        let [coord_x, coord_y] = coords_for_grid(d.x, d.y);

        sprite_draw(ctx, game.img.grids, grid_sprite_size, grid_sprite_size, 4, 0, coord_x, coord_y);
    }
}
