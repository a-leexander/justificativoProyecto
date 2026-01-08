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



//Rutas 

app.get("/login", (req, res)=>{
    res.render("login");
});
app.get("/home", (req, res) => {
    if (req.session.loggedin) {
        res.render("home", {
            login: true,
            user: req.session.user
        });
    } else {
        res.redirect("/login");
    }
});


app.get("/formulario", (req, res) => {

    if (
        !req.session.loggedin || !req.session.user || req.session.user.tipo !== "A"
    ) {
        return res.redirect("/login");
    }

    const rutAlumno = req.session.user.rut;

    conexion.query(
        "SELECT * FROM Alumno WHERE rut = ?",
        [rutAlumno],
        (error, results) => {

            if (error) {
                console.error(error);
                return res.send("Error en la base de datos");
            }

            if (results.length === 0) {
                return res.send("Alumno no encontrado");
            }

            res.render("formulario", {
                alumno: results[0]
            });
        }
    );
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
                req.session.user = {rut: results[0].rut, tipo: results[0].tipo};
                res.redirect("/home");
                console.log(req.body);
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
    });
});




const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, "uploads/");
    },
    filename: (req, file, cb) => {
        cb(null, `justificativo_${Date.now()}.pdf`);
    }
});

//limitante de archivos a solo pdf
const upload = multer({
    storage: storage,
    limits:{
        fileSize: 2 * 1024 * 1024
    },
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
        return res.redirect("No se subió ningún PDF", "/formulario");
    }

    res.redirect("/home");
});

app.use((err, req, res, next) => {

    if (err instanceof multer.MulterError) {
        if (err.code === "LIMIT_FILE_SIZE") {
            return res.send("El archivo supera el tamaño máximo permitido");
        }
    }

    if (err) {
        return res.send(err.message);
    }

    next();
});



app.listen(3000, function(){
    console.log("Servidor creado http://localhost:3000");
});


