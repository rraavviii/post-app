require('dotenv').config();
const express = require('express');
const app = express();
const path = require("path");
const cookieParser = require('cookie-parser');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const userModel = require('../models/user'); // Adjust the path as needed
const postModel = require('../models/post'); // Adjust the path as needed
const { sendMail } = require('../helper/sendmail'); // Adjust the path as needed
const upload = require('../config/multerconfig'); // Adjust the path as needed

app.set('view engine', 'ejs');
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, '../public')));

const SECRET_KEY = process.env.SECRET_KEY;

app.get('/', function(req, res) {
   res.render('index');
});

app.post('/register', async function(req, res, next) {
   try {
      let { name, username, email, password, age } = req.body;
      let user = await userModel.findOne({ email });
      if (user) return res.status(300).send('User already exist');

      sendMail(email, "Welcome To our Post website", `Hi ${name} Thank You for Registring. happy diwali`);
      bcrypt.genSalt(10, async (err, salt) => {
         if (err) return next(err);
         bcrypt.hash(password, salt, async (err, hash) => {
            if (err) return next(err);
            let user = await userModel.create({
               username,
               name,
               email,
               password: hash,
               age
            });
            let token = jwt.sign({ email: email, userId: user._id }, SECRET_KEY);
            res.cookie('token', token);
            res.redirect('/login');
         });
      });
   } catch (error) {
      next(error);
   }
});

app.get('/login', function(req, res) {
   res.render('login');
});

app.post('/login', async function(req, res, next) {
   try {
      let { email, password } = req.body;
      let user = await userModel.findOne({ email });
      if (!user) return res.status(500).send('User not found');

      bcrypt.compare(password, user.password, function(err, result) {
         if (err) return next(err);
         if (result) {
            let token = jwt.sign({ email: email, userId: user._id }, SECRET_KEY);
            res.cookie('token', token);
            return res.status(200).redirect('/profile');
         } else {
            res.redirect('/login');
         }
      });
   } catch (error) {
      next(error);
   }
});

app.get('/delete', isLoggedin, async function(req, res, next) {
   try {
      let user = await userModel.findOneAndDelete({ email: req.user.email });
      res.redirect('/login');
   } catch (error) {
      next(error);
   }
});

app.get('/profile', isLoggedin, async function(req, res, next) {
   try {
      let user = await userModel.findOne({ email: req.user.email }).populate('posts');
      res.render('profile', { user });
   } catch (error) {
      next(error);
   }
});

app.post('/post', isLoggedin, async function(req, res, next) {
   try {
      let user = await userModel.findOne({ email: req.user.email });
      let { content } = req.body;
      let post = await postModel.create({
         user: user._id,
         content
      });
      user.posts.push(post._id);
      await user.save();
      res.redirect('/profile');
   } catch (error) {
      next(error);
   }
});

app.get('/logout', function(req, res) {
   res.cookie('token', "");
   res.redirect('/login');
});

app.get('/like/:id', isLoggedin, async function(req, res, next) {
   try {
      let post = await postModel.findOne({ _id: req.params.id }).populate('user');

      if (post.likes.indexOf(req.user.userId) === -1) {
         post.likes.push(req.user.userId);
      } else {
         post.likes.splice(post.likes.indexOf(req.user.userId), 1);
      }
      await post.save();
      res.redirect('/profile');
   } catch (error) {
      next(error);
   }
});

app.get('/profile/upload', isLoggedin, function(req, res) {
   res.render('profileupload');
});

app.post('/upload', isLoggedin, upload.single('image'), async function(req, res, next) {
   try {
      let user = await userModel.findOne({ email: req.user.email });
      user.profilepic = req.file.filename;
      await user.save();
      res.redirect('/profile');
   } catch (error) {
      next(error);
   }
});

app.get('/edit/:id', isLoggedin, async function(req, res, next) {
   try {
      let post = await postModel.findOne({ _id: req.params.id }).populate('user');
      res.render('edit', { post });
   } catch (error) {
      next(error);
   }
});

app.get('/delete/:id', isLoggedin, async function(req, res, next) {
   try {
      let post = await postModel.findOneAndDelete({ _id: req.params.id });
      res.redirect('/profile');
   } catch (error) {
      next(error);
   }
});

app.get('/read', isLoggedin, async function(req, res, next) {
   try {
      let posts = await postModel.find().populate('user');
      let currentuser = await userModel.findOne({ email: req.user.email });
      res.render('read', { posts, currentuser });
   } catch (error) {
      next(error);
   }
});

app.post('/update/:id', isLoggedin, async function(req, res, next) {
   try {
      let post = await postModel.findOneAndUpdate({ _id: req.params.id }, { content: req.body.content });
      res.redirect('/profile');
   } catch (error) {
      next(error);
   }
});

function isLoggedin(req, res, next) {
   const token = req.cookies.token;

   if (!token) {
      return res.redirect('/login');
   }
   jwt.verify(token, SECRET_KEY, (err, data) => {
      if (err) {
         console.log('Token verification failed:', err);
         return res.redirect('/login');
      }
      req.user = data;
      next();
   });
}

// Handle invalid routes
app.use((req, res, next) => {
   res.status(404).send('Sorry, we cannot find that!');
});

// Global error handling middleware
app.use((err, req, res, next) => {
   console.error(err.stack);
   res.status(500).send('Something went wrong! Please try again later.');
});

module.exports = app;
