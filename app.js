//Invocamos express (server)
const express = require("express");
const app = express();

//seteamos urlencoded para capturar datos de formulario
app.use(express.urlencoded({extended:false}));
app.use(express.json());

//invocamos dotenv
const  dotenv = require("dotenv");
dotenv.config({path:"./env/.env"});

//seteamos el directorio public
app.use("/resources", express.static("public"));
app.use("/resources", express.static(__dirname + "/public"));
// console.log(__dirname)

//establecemos el motor de plantillas 
app.set("view engine", "ejs");

// Var de session
const session = require("express-session");
app.use (session({
    secret: "secret",
    resave: true,
    saveUninitialized:true
}));

//conexion a base de datos
const conexion = require("./database/db")
// multer para los archivos pdf
const multer = require("multer");
const path = require("path");
const { error } = require("console");

const upload = multer({
    dest: "uploads/",
    fileFilter: (req, file, cb) => {
        if (file.mimetype === "application/pdf") {
            cb(null, true);
        } else {
            cb(new Error("Solo se permiten archivos PDF"));
        }
    }
});

//Creacion del edpoint para recibir solo una url (una imagen)
app.post("/enviar-justificativo", upload.single("certificado"), (req, res) => {

    // Datos del formulario
    console.log(req.body);

    // Archivo PDF
    console.log(req.file);

    
    if (!req.file) {
        return res.send("No se subió ningún PDF");
    }

    res.send("Formulario y PDF recibidos correctamente");
});


//Rutas 
app.get("/", (req, res)=>{
    res.render("index");
});

app.get("/login", (req, res)=>{
    res.render("login");
});
app.get("/home", (req, res) => {
    if (req.session.loggedin) {
        res.render("home", {
            login: true,
            name: req.session.name
        });
    } else {
        res.redirect("/login");
    }
});

app.get("/formulario", (req, res)=>{
    res.render("formulario");
});

//Autenticación
app.post('/auth', async (req, res)=>{
    const { user, pass } = req.body;
    
    if(user && pass){
        conexion.query("select * from usuario where rut = ?", [user], async (error, results)=>{
            if(results.length == 0 || pass !== results[0].contrasena){
                res.render("login", {
                    alert: true,
                    alertTitle: "error",
                    alertMessage: "Usuario y/o password incorrectas",
                    alertIcon: "error",
                    showConfirmButton: true,
                    timer: false,
                    ruta: "login"
                })
            }else{
                req.session.loggedin =true;
                req.session.name = results[0].name
                res.render("login", {
                    alert: true,
                    alertTitle: "Conexion exitosa",
                    alertMessage: "Inisio de sesión correcto",
                    alertIcon: "success",
                    showConfirmButton: false,
                    timer: 1500,
                    ruta: "home"
                })
            }
        })
    }else{
        res.render("login", {
                    alert: false,
                    alertTitle: "Advertencia",
                    alertMessage: "Porfavor ingrese su RUT y Contraseña",
                    alertIcon: "warning",
                    showConfirmButton: true,
                    timer: false,
                    ruta: "login"
                })
    }
});

//auth pages 
app.get("/", (req, res)=>{
    if(req.session.loggedin){
        res.render("index", {
            login: true,
            name: req.session.name
        });
    }else{
        res.render("index", {
            login: false,
            name: "Debe iniciar sesión"
        });
    }
});

// logaout
app.get("/logout", (req, res)=>{
    req.session.destroy(()=>{
        res.redirect("/")
    })
})

app.listen(3000, function(){
    console.log("Servidor creado http://localhost:3000");
});


