

//I SHOULD DISABLE AUTOPUBLISH AT SOME POINT 

// declare collections
Openings = new Meteor.Collection("openings", {idGeneration: 'MONGO'});
Moves = new Meteor.Collection("Moves", {idGeneration: 'MONGO'});


if (Meteor.isClient) {

   /* Top navigation and main content helpers
   * ---------------------
   */
  Template.menu_screen.events({
    'click #prepareBtn' : function () {
      Session.set("prepORpractice", "prep")
      Session.set("selected_opening_id", undefined);
      Session.set("selected_opening_name", undefined);
      Session.set("current_FEN", 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1');//initial starting position
    },
    'click #practiceBtn' : function () {
      Session.set("prepORpractice", "practice");
      Session.set("current_FEN", 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'); //initial starting position
    }
  });

  Template.menu_screen.helpers({
    sessionNotSet: function () {
      return Session.equals("prepORpractice", undefined);
    },
    isPrep: function() {
      return Session.equals("prepORpractice", "prep");
    },
    isPractice: function() {
      return Session.equals("prepORpractice", "practice");
    }
  });

  Template.main_content.helpers({
    isPrep: function() {
      return Session.equals("prepORpractice", "prep");
    },
    isPractice: function() {
      return Session.equals("prepORpractice", "practice");
    }
  });



  /* Practice Board
   * ---------------------
   * Creates the practice board only after DOM has rendered (required by chessboard.js).
   * Board gets re-rendered any time session variables in auto_render template are updated.
   */
  Template.chess_board_practice.rendered = function () {
    if (!this.rendered){
      practice_board = new ChessBoard('practice_board', {
        position: 'start',
        showNotation: false,
        draggable: false
      });
      this.rendered = true;
      console.log("Board created.");
    } else {
        if(!Session.equals("current_FEN", undefined)) {
          practice_board.position(Session.get("current_FEN"));
          console.log("Board has been re-rendered.");
        } else {
          console.log("Board not re-rendered: current_FEN not set.");
        }
    }
  };

  Template.chess_board_practice.events({
    'click #whiteOrientationBtn' : function () {
      practice_board.orientation('white');
    },
    'click #blackOrientationBtn' : function () {
      practice_board.orientation('black');
    },   
    'click #backBtn' : function () {
      var m = Moves.findOne({opening: Session.get("selected_opening_name"), FEN: Session.get("current_FEN")});
      Session.set("current_FEN", m.parentFEN);
    },
    'click #forwardBtn' : function () {
      var m = Moves.findOne({opening: Session.get("selected_opening_name"), parentFEN: Session.get("current_FEN")});
      Session.set("current_FEN", m.FEN);
    },
    'click option': function() {
      Session.set("selected_opening_name", this.name);
      Session.set("selected_opening_id", this._id);
      Session.set("selected_opening_side", this.side);
      practice_board.orientation(Session.get("selected_opening_side"));
    }
  });

  Template.chess_board_practice.helpers({
    getUserOpenings: function () {
      var userid = 1; //should match userid!!
      var a = Openings.find(
        { creator: userid},
        { sort: [["side","desc"],["name", "asc"]]}
      );
      if (a.count() > 0) { return a.fetch() }  else { return false };
    },

    openingSelected: function() {
      return !Session.equals("selected_opening_id", undefined);
    },

    showOpeningName: function() {
      return Session.get("selected_opening_name");
    }
  });



 /* Auto Render 
  * ------------------
  * Used to simulate recursive callbacks whenever the DOM is updated on the chess board.
  * This is in a separate template because all templates are re-rendered every time a nested template is updated 
  */
  Template.auto_render.helpers({
    current_FEN_updated1 : function() {
      console.log(Session.get("current_FEN"));
      prep_board.position(Session.get("current_FEN"));
      $('#fen').html(Session.get("current_FEN"));
      $('#pgn').html(Session.get("current_PGN"));
   },
    current_FEN_updated2 : function() {
      console.log(Session.get("current_FEN"));
      practice_board.position(Session.get("current_FEN"));
      //$('#fen').html(Session.get("current_FEN"));
      //$('#pgn').html(Session.get("current_PGN"));
   },
    isPrep: function() {
      return Session.equals("prepORpractice", "prep");
    },

    isPractice: function() {
      return Session.equals("prepORpractice", "practice");
    }
 });


  /* Preparation Home
   * --------------------------
   * Responsible for all CRUD operations on Openings
   */
  Template.prepare_home.events({
    'click input[name="form_newopening_Btn"]' : function () {

      console.log("Name: " + $('input[name=form_newopening_name]').val() 
                + ", Side: " + $('input[name=form_newopening_side]:checked').val() 
                + ", Status: " + $('input[name=form_newopening_status]:checked').val() );
      

      //Validate Input Fields
      var error_flag = 0;
      var name = $('input[name=form_newopening_name]').val();
      var side = $('input[name=form_newopening_side]:checked').val();
      var status = $('input[name=form_newopening_status]:checked').val();

      name = name.replace(/[^a-z0-9 ,.?!]/ig, ''); // replace invalid characters in name field with space

      //Was name field filled out?
      if(name == undefined || name.length <= 0) {
        console.log("name error");
        //display error
        error_flag = 1;
      }

      if(Openings.find({name: name}).count() != 0) {
        console.log("name already taken");
        //display error
        error_flag = 1;
      }

      //Is the side field one of the two available choices
      if(side != "black" && side != "white") {
        //display error
        console.log("side error");
        error_flag = 1;
      }

      //Is the status field one of the three available choices
      if(status != "private" && status != "protected" && status != "public") {
        console.log("status empty... setting to public");
        status = "public";
      }

      if (error_flag == 0) {
        console.log("Form validation successful.");
        //insert opening into database
        Meteor.call('db_createOpening', name, side, status, 
            //client side call back function for error handling
            function(error, response) { 
              if(error == undefined) {
                console.log('Database write was successful - ', response);
              } else {
                console.log('There was an error - ', error);
              }
          });
      }

    }, 

    'click #display_form_newopening': function () {
        $('#form_newopening').slideToggle();
        console.log("Success");
    },

    'click li': function() {
      Session.set("selected_opening_id", this._id);
      Session.set("selected_opening_name", this.name);
      Session.set("selected_opening_side", this.side);
      console.log("selected_opening sessions set: " + this.name + " - " + this.side + " - " + this._id);
    },

    'click input.delete': function (event) { 
        if(confirm("Please confirm that you would like to delete the opening name " + this.name) == true){
            Openings.remove(this._id);
            Session.set("selected_opening_id", undefined);
            Session.set("selected_opening_name", undefined);
            event.stopPropagation();
        }  
    },

    'click #r1': function () {
        $('#board').show();
    },

    'click #r2': function () {
        $('#board').hide();
    }

  });

  Template.prepare_home.helpers({
    getUserOpenings: function () {
      var userid = 1; //should match userid!!
      var a = Openings.find(
        { creator: userid},
        { sort: [["side","desc"],["name", "asc"]]}
      );
      if (a.count() > 0) { return a.fetch() }  else { return false };
    },

    openingSelected: function() {
      return !Session.equals("selected_opening_id", undefined)
    }
  });

  Template.prepare_home.rendered = function () {
    $('#form_newopening').hide(0); //initial state of form should be hidden
    $('#board').hide(0); //initial state of form should be hidden
  }


Template.opening_home.events({
  'click option': function() {
    Session.set("selected_opening_name", this.name);
    Session.set("selected_opening_id", this._id);
    Session.set("selected_opening_side", this.side);
    prep_board.orientation(Session.get("selected_opening_side"));
    console.log("selected_opening sessions set: " + this.name + " - " + this.side + " - " + this._id);
  }
});

Template.opening_home.helpers({ 
  showOpeningName: function() {
    return Session.get("selected_opening_name"); 
  },

  getUserOpenings: function () {
    var userid = 1; //should match userid!!
    var a = Openings.find(
      { creator: userid},
      { sort: [["side","desc"],["name", "asc"]]}
    );
    if (a.count() > 0) { return a.fetch() }  else { return false };
  }
});




  /* Preparation Board
   * --------------------------
   * Gets current state of board, determines whether legal moves are allowed, and enters new moves into database.
   */

  //advanced board using chess.js for legal move detection
  Template.chess_board_prepare.rendered = function () {

    var board, //this variable should not match div id element!
      game = new Chess(),
      statusEl = $('#status'),
      fenEl = $('#fen'),
      pgnEl = $('#pgn');

    // do not pick up pieces if the game is over
    // only pick up pieces for the side to move

    var onDragStart = function(source, piece, position, orientation) {
    
      Session.set("parent_fen", Session.get("current_FEN"));
      //Session.set("parent_pgn", Session.get("current_PGN"));
      //Session.set("parent_move", Moves.find({opening: Session.get("selected_opening_name"), FEN: Session.get("current_FEN")}).move);
      //console.log(Session.get("parent_move"));

      if (game.game_over() === true ||
          (game.turn() === 'w' && piece.search(/^b/) !== -1) ||
          (game.turn() === 'b' && piece.search(/^w/) !== -1)) {
        return false;
      }
    };

    var onDrop = function(source, target) {
      // see if the move is legal
      var move = game.move({
        from: source,
        to: target,
        promotion: 'q' // NOTE: always promote to a queen for example simplicity
      });

      // illegal move
      if (move === null) return 'snapback';

      updateStatus();
    };

    // update the board position after the piece snap 
    // for castling, en passant, pawn promotion
    var onSnapEnd = function() {
      prep_board.position(game.fen());
    };

    var onChange = function() {
      game.load(Session.get("current_FEN"));
      game.load_pgn(Session.get("current_PGN"));
    };

    var updateStatus = function() {
      var status = '';

      var moveColor = 'White';
      if (game.turn() === 'b') {
        moveColor = 'Black';
      }

      // checkmate?
      if (game.in_checkmate() === true) {
        status = 'Game over, ' + moveColor + ' is in checkmate.';
      }

      // draw?
      else if (game.in_draw() === true) {
        status = 'Game over, drawn position';
      }

      // game still on
      else {
        status = moveColor + ' to move';

        // check?
        if (game.in_check() === true) {
          status += ', ' + moveColor + ' is in check';
        }
      }

      statusEl.html(status);
      fenEl.html(game.fen());
      pgnEl.html(game.pgn());

      Session.set("current_FEN", game.fen());
      Session.set("current_PGN", game.pgn());

      if(moveColor=='White') {
        var moveNum = game.fen().split(" ").slice(-1)[0]-1 + ". ... ";
        var parentNotation = game.pgn().split(" ").slice(-3)[0] + " " + game.pgn().split(" ").slice(-3)[1];
      } else {
        var moveNum = game.fen().split(" ").slice(-1)[0] + ". ";
        var parentMoveNum = game.fen().split(" ").slice(-1)[0]-1 + ". ... ";
        var parentNotation = parentMoveNum + game.pgn().split(" ").slice(-3)[0];
      }
      var moveNotation = game.pgn().split(" ").slice(-1)[0]; //get last move from pgn data
      
      var dbMove = moveNum + moveNotation;
      if (dbMove != "0. ... ") { // not the first move

        if(Moves.find({opening: Session.get("selected_opening_name"), FEN: game.fen()}).count() == 0) {
          Meteor.call('db_insertMove', dbMove, parentNotation, game.fen(), game.pgn(), Session.get("parent_fen"), Session.get("selected_opening_name"),
              //client side call back function for error handling
              function(error, response) { 
                if(error == undefined) {
                  console.log('Database write was successful - ', response);
                } else {
                  console.log('There was an error - ', error);
                }
            });
        }
      }
    };

    var cfg = {
      draggable: true,
      position: 'start',
      showNotation: false,
      orientation: Session.get("selected_opening_side"),
      onDragStart: onDragStart,
      onDrop: onDrop,
      onSnapEnd: onSnapEnd,
      onChange: onChange
    };
    prep_board = new ChessBoard('prep_board', cfg);

    updateStatus();

  };

  Template.chess_board_prepare.events({
    'click #whiteOrientationBtn' : function () {
      prep_board.orientation('white');
    },
    'click #blackOrientationBtn' : function () {
      prep_board.orientation('black');
    },    
    'click #backBtn' : function () {
      var m = Moves.findOne({opening: Session.get("selected_opening_name"), FEN: Session.get("current_FEN")});
      Session.set("current_FEN", m.parentFEN);
    },
    'click #forwardBtn' : function () {
      var m = Moves.findOne({opening: Session.get("selected_opening_name"), parentFEN: Session.get("current_FEN")});
      Session.set("current_FEN", m.FEN);
    }
  });





  /* Nested Tree Display
   * ----------------------
   * Moves are stored as linked lists and this code traverses the linked list and displays the information
   */

  Template.print_moves.helpers({
    first_move : function () {
      return Moves.find({opening: Session.get("selected_opening_name"), parent: "0. ... 1."}).fetch();
      //return Openings.find({name: Session.get("selected_opening_name")}).fetch()[0].moves;
      //return Openings.find({parent: ""}).fetch();
    },
    openingSelected: function() {
      return !Session.equals("selected_opening_id", undefined);
    },
    showOpeningName: function() {
      return Session.get("selected_opening_name");
    }
  });

  Template.print_moves.events({
    'click li' : function (event) {
      Session.set("current_FEN", this.FEN);
      Session.set("current_PGN", this.PGN);
      event.stopPropagation();
    },
  });

  Template.display_opening.hasChildren = function() {
    return Moves.find({opening: Session.get("selected_opening_name"), parent: this.move, parentFEN: this.FEN}).count() > 0; //boolean
    //return Openings.find({parent: Session.get("selected_opening_name")}).count() > 0; //boolean
    //return Openings.find({parent: this._id}).count() > 0; //boolean
  };

  Template.display_opening.children = function() {
    return Moves.find({opening: Session.get("selected_opening_name"), parent: this.move, parentFEN: this.FEN});
    //return Openings.find({parent: Session.get("selected_opening_name")});
    //return Openings.find({parent: this._id});
  };

  Template.display_opening.Move = function() {
    return this.moves;
  }

} // end Meteor.isClient



if (Meteor.isServer) {
  
  // code to run on server at startup
  Meteor.startup(function () {
    
  });

  // functions that can be called from client side
  Meteor.methods({ 
    db_createOpening: function(name, side, status) {
      Openings.insert(
      {

      name: name,
      creator: 1, //to match current user_id in future
      side: side,
      status: status
      } , 
        //server side call back function for error handling
        function(error, response) { 
          if(error == undefined) {
            console.log('Database write was successful - ', response);
            return 'Success';
          } else {
            console.log('There was an error - ', error);
            return false;
          }
        }
      );
    },

    db_insertMove: function(move_arg, parent_arg, fen_arg, pgn_arg, parentFen_arg, opening_arg) {
      Moves.insert(
         { 
          move: move_arg, 
          parent: parent_arg,
          FEN: fen_arg,
          PGN: pgn_arg,
          parentFEN: parentFen_arg,
          opening: opening_arg,
         } ,
          //server side call back function for error handling
          function(error, response) { 
            if(error == undefined) {
              console.log('Database write was successful - ', response);
              return 'Success';
            } else {
              console.log('There was an error - ', error);
              return false;
            }
          }
        );
    }

  }); // end Meteor.methods
 
} // end Meteor.isServer
