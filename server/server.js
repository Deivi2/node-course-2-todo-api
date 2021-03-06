//When we will test this code will make sure that development database wont be touch but just testDatabase


require('./config/config');

const _ = require('lodash');
const express = require('express');
const bodyParser = require('body-parser');
const {ObjectID} = require('mongodb');

const {mongoose} = require('./db/mongoose.js')
const {Todo} = require('./models/todo.js');
const {User} = require('./models/user.js');
var {authenticate} = require('./middleware/authenticate.js');


const app = express();

var port = process.env.PORT;
//middleware
app.use(bodyParser.json());

app.post('/todos', authenticate, (req, res) => {

    var todo = new Todo({
        text: req.body.text,
        _creator_id: req.user._id
    });


    todo.save().then((doc) => {
        res.send(doc);
    }, (e) => {
        res.status(404).send(e);
    })
});


app.get('/todos', authenticate ,(req, res) => {
    Todo.find({
        _creator_id : req.user._id
    }).then((todos) => {
        res.send({todos});
    }, (e) => {
        res.status(404).send(e);
    })
});


//GET /todos/231231233

app.get('/todos/:id',authenticate, (req, res) => {
    var id = req.params.id;
    // res.send(req.params.id);
    if (!ObjectID.isValid(id)) {
        return res.status(404).send();
    }
    Todo.findOne({
        _id: id,
        _creator_id: req.user._id

    }).then((todo) => {
        if (!todo) {
            return res.status(404).send()
        }
        res.send({todo: todo});
    }).catch((e) =>
        res.status(404).send());
});

app.delete('/todos/:id', authenticate, (req, res) => {
    var id = req.params.id;



    if (!ObjectID.isValid(id)) {
        return res.status(404).send();
    }

    Todo.findOneAndRemove({
        _id: id,
        _creator_id: req.user._id
    }).then((todo) => {
        if (!todo) {
            return res.status(404).send();
        }
        res.send({todo});
    }).catch((e) => res.status(404).send())

});


app.patch('/todos/:id', authenticate, (req, res) => {
    var id = req.params.id;
    var body = _.pick(req.body, ['text', 'completed']);

    if (!ObjectID.isValid(id)) {
        return res.status(404).send();
    }
    //if its boolean and its true
    if (_.isBoolean(body.completed) && body.completed) {
        body.completedAt = new Date().getTime();
    } else {
        body.completed = false;
        body.completedAt = null;
    }

    Todo.findOneAndUpdate({
        _id: id,
        _creator_id: req.user._id

    }, {$set: body}, {new: true}).then((todo) => {
        if (!todo) {
            return res.status(404).send();
        }

        res.send({todo})

    }).catch((e) => {
        res.status(400).send();
    })


});


/////////Users page POST /users

app.post('/users', (req, res) => {

    var body = _.pick(req.body, ['email', 'password']);
    var user = new User(body);

    user.save().then((user) => {
        return user.generateAuthToken();
    }).then((token) => {
        res.header('x-auth', token).send(user);
    }).catch((e) => {
        res.status(404).send(e)
    });

});


app.get('/users/me', authenticate, (req, res) => {
    res.send(req.user);
});


//POST /users/login {email, password}


app.post('/users/login', (req, res) => {
    var body = _.pick(req.body, ['email', 'password']);

    User.findByCredentials(body.email, body.password).then((user) => {
        return user.generateAuthToken().then((token) => {
            res.header('x-auth', token).send(user);
        });
    }).catch((e) => {
        res.status(404).send();

    });
});


app.delete('/users/me/token', authenticate, (req, res) => {
    req.user.removeToken(req.token).then(() => {
        res.status(200).send();
    }, () => {
        res.status(400).send();
    });
});


app.listen(port, () => {
    console.log(`Started on port ${port} `);
});


module.exports = {
    app
};