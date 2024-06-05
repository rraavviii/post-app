const express=require('express')
const app=express()
const path=require("path")
const nodemailer = require("nodemailer");
const cookieParser = require('cookie-parser')
const userModel=require('./models/user')
const postModel=require('./models/post')
let bcrypt=require('bcrypt')
const jwt=require('jsonwebtoken');
const { sendMail } = require('./helper/sendmail');
const port=5000

app.set('view engine','ejs')
app.use(express.json())
app.use(express.urlencoded({extended: true}))
app.use(cookieParser())
app.use(express.static(path.join(__dirname, 'public')))

app.get('/',function(req,res) {
   res.render('index')
})

app.post('/register',async function(req,res) {
   let{name,username,email,password,age}=req.body

   let user= await userModel.findOne({email})
   if(user)
   return res.status(300).send('User already exist')

sendMail(email,"Welcome To our Post website ", `Hi ${name} Thank You for Registring. happy diwali`)


bcrypt.genSalt(10,(err,salt)=>{
   bcrypt.hash(password,salt, async (err, hash)=>{
      let user = await userModel.create({
         username,
         name,
         email,
         password: hash,
         age
      })
      let token = jwt.sign({email:email, userId: user._id}, 'ravikumar')
      res.cookie('token', token)
      res.redirect('/login')
   })
})
   
})



app.get('/login',function(req,res) {
   res.render('login')
})



app.post('/login', async function(req,res) {
   
   let{email,password}=req.body

   let user= await userModel.findOne({email})
   if(!user)
   return res.status(500).send('somthing went wrong')
bcrypt.compare(password,user.password,function(err,result){
   if(result){
      let token = jwt.sign({email:email, userId: user._id}, 'ravikumar')
     
      res.cookie('token', token)
   return res.status(200).redirect('/profile')
   
   }
   else
   res.redirect('/login')
})
})

app.get('/profile',isLoggedin, async function(req,res) {
   let user=await userModel.findOne({email:req.user.email}).populate('posts')
   
   res.render('profile',{user})

})
app.post('/post',isLoggedin, async function(req,res) {
   let user=await userModel.findOne({email:req.user.email})
   let {content}=req.body
   let post = await postModel.create({
      user: user._id,
      content
   })
user.posts.push(post._id)
await user.save()
res.redirect('/profile')
})

app.get('/logout',function(req,res) {
   res.cookie('token', "")
   res.redirect('/login')
})


app.get('/like/:id',isLoggedin, async function(req,res) {
   let post=await postModel.findOne({_id:req.params.id}).populate('user')
   

   if(post.likes.indexOf(req.user.userId)  === -1 ){
      post.likes.push(req.user.userId)
   }
   else{
      post.likes.splice(post.likes.indexOf(req.user.userId),1)
   }
   await post.save()
   res.redirect('/profile')

})



app.get('/edit/:id',isLoggedin, async function(req,res) {
   let post=await postModel.findOne({_id:req.params.id}).populate('user')
   
   res.render('edit',{post})

})

app.post('/update/:id',isLoggedin, async function(req,res) {
   let post=await postModel.findOneAndUpdate({_id:req.params.id} , {content: req.body.content})
   
   res.redirect('/profile')

})



function isLoggedin(req, res, next) {
   const token = req.cookies.token;
   
   if (!token) {
       return res.redirect('/login');
   }
   jwt.verify(token, 'ravikumar', (err, data) => {
       if (err) {
           console.log('Token verification failed:', err);
           return res.redirect('/login');
       }
       req.user = data;
       next();
   });
}


app.listen(port)










// const express = require('express');
// const app = express();
// const cookieParser = require('cookie-parser');
// const userModel = require('./models/user');
// const postModel = require('./models/post');
// let bcrypt = require('bcrypt');
// const jwt = require('jsonwebtoken');
// const port = 5000;

// app.set('view engine', 'ejs');
// app.use(express.json());
// app.use(express.urlencoded({ extended: true }));
// app.use(cookieParser());

// app.get('/', function (req, res) {
//     res.render('index');
// });

// app.post('/register', async function (req, res) {
//     let { name, username, email, password, age } = req.body;

//     let user = await userModel.findOne({ email });
//     if (user) return res.status(300).send('User already exists');
//     bcrypt.genSalt(10, (err, salt) => {
//         if (err) return res.status(500).send('Error generating salt');
//         bcrypt.hash(password, salt, async (err, hash) => {
//             if (err) return res.status(500).send('Error hashing password');
//             try {
//                 let user = await userModel.create({
//                     username,
//                     name,
//                     email,
//                     password: hash,
//                     age
//                 });
//                 let token = jwt.sign({ email: email, userId: user._id }, 'ravikumar');
//                 res.cookie('token', token);
//                 res.redirect('/login');
//             } catch (error) {
//                 res.status(500).send('Error creating user');
//             }
//         });
//     });
// });

// app.get('/login', function (req, res) {
//     res.render('login');
// });

// app.post('/login', async function (req, res) {
//     let { email, password } = req.body;

//     let user = await userModel.findOne({ email });
//     if (!user) return res.status(500).send('User not found');
//     bcrypt.compare(password, user.password, function (err, result) {
//         if (err) return res.status(500).send('Error comparing passwords');
//         if (result) {
//             let token = jwt.sign({ email: email, userId: user._id }, 'ravikumar');
//             console.log(token);
//             res.cookie('token', token);
//             return res.status(200).redirect('/profile');
//         } else {
//             res.redirect('/login');
//         }
//     });
// });

// app.get('/profile', isLoggedin, async function (req, res) {
//     let user = await userModel.findOne({ email: req.user.email }).populate('posts');
//     res.render('profile', { user });
// });

// app.post('/post', isLoggedin, async function (req, res) {
//     let user = await userModel.findOne({ email: req.user.email });
//     let { content } = req.body;
//     let post = await postModel.create({
//         user: user._id,
//         content
//     });
//     user.posts.push(post._id);
//     await user.save();
//     res.redirect('/profile');
// });

// app.get('/logout', function (req, res) {
//     res.cookie('token', "");
//     res.redirect('/login');
// });

// function isLoggedin(req, res, next) {
//     const token = req.cookies.token;
//     console.log(token);
//     if (!token) {
//         return res.redirect('/login');
//     }
//     jwt.verify(token, 'ravikumar', (err, data) => {
//         if (err) {
//             console.log('Token verification failed:', err);
//             return res.redirect('/login');
//         }
//         req.user = data;
//         next();
//     });
// }

// app.listen(port, () => {
//     console.log(`Server running on http://localhost:${port}`);
// });