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

        if (!req.session.loggedin) {
            return res.redirect("/login");
        }

        const sqlDatos = `SELECT 
    j.id_inasistencia,
    a.rut,
    a.nombre_completo,
    a.correo,
    c.nombre AS carrera,
    asig.nombre AS asignatura,
    j.fecha_prueba,
    j.estado
FROM Justificativo j
JOIN Alumno a ON j.rut_alumno = a.rut
JOIN Carrera c ON a.ua_carrera = c.ua
JOIN Asignatura asig ON j.id_asignatura = asig.id_asignatura
ORDER BY j.estado ASC, j.fecha_prueba ASC;
`;

        const sqlStats = `SELECT 
    COUNT(*) total,
    SUM(estado = 3) aprobados,
    SUM(estado = 1) pendientes,
    SUM(estado = 2) rechazados
FROM Justificativo;`;

        conexion.query(sqlDatos, (err, datos) => {
            if (err) return res.send("Error al cargar dashboard");

            conexion.query(sqlStats, (err, stats) => {
                if (err) return res.send("Error estadísticas");

                res.render("home", {
                    login: true,
                    user: req.session.user,
                    datos,
                    stats: stats[0]
                });
            });
        });
    });




    app.get("/formulario", (req, res) => {

        if (!req.session.loggedin || req.session.user.tipo !== "A") {
            return res.redirect("/login");
        }

        const rutAlumno = req.session.user.rut;

        const sqlAlumno = `SELECT Alumno.rut, Alumno.nombre_completo, Alumno.correo, Alumno.telefono, Carrera.ua AS ua_carrera,
                        Carrera.nombre AS nombre_carrera, Carrera.jornada, Carrera.semestre FROM Alumno
                        INNER JOIN Carrera ON Alumno.ua_carrera = Carrera.ua WHERE Alumno.rut = ?`;

        conexion.query(sqlAlumno, [rutAlumno], (error, results) => {

            if (error || results.length === 0) {
                return res.send("Error alumno");
            }

            const alumno = results[0];

            const sqlAsignaturas = `SELECT a.id_asignatura, a.nombre, a.seccion, d.nombre AS docente
                                    FROM Asignatura a INNER JOIN Docente d ON a.rut_docente = d.rut WHERE a.ua_carrera = ?`;


            conexion.query(sqlAsignaturas, [alumno.ua_carrera], (err2, asignaturas) => {

                if (err2) {
                    return res.send("Error asignaturas");
                }
                console.log(asignaturas);
                res.render("formulario", {
                    alumno,
                    asignaturas
                });
            });
        });
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
            res.render("home", {
                login: true,
                
            });
        }else{
            res.redirect("login")
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

        if (!req.session.loggedin || req.session.user.tipo !== "A") {
        return res.redirect("/login");
        }

        if (!req.file) {
        return res.send("Debe adjuntar un certificado PDF");
        }
        const {fecha_evaluacion, id_asignatura, motivo} = req.body;

        const rut_alumno = req.session.user.rut;
        const estado = 1; // Pendiente
        const fecha_emision = new Date();
        const ruta_archivo = req.file.path;

        const sqlInsert = `INSERT INTO Justificativo(motivo, estado, fecha_emision, fecha_prueba, ruta_archivo,
                            rut_alumno,id_asignatura)    VALUES (?, ?, ?, ?, ?, ?, ?)`;
        conexion.query(sqlInsert,[motivo, estado, fecha_emision,fecha_evaluacion, ruta_archivo, rut_alumno, id_asignatura],
        (error) => {
            if (error) {
                console.log(error);
                return res.send("Error al guardar justificativo");
            }

            res.redirect("/home");
        });
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
