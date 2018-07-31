var gulp = require("gulp");
var fileInline = require("gulp-file-inline");
var htmlmin = require("gulp-htmlmin");
var rev = require("gulp-rev");
var imagemin = require("gulp-imagemin");
var revCollector = require("gulp-rev-collector");
var del = require("del");
var javascriptObfuscator = require("gulp-javascript-obfuscator");
const shell = require('gulp-shell')
const zip = require('gulp-zip');
const scp = require('gulp-scp2');
const GulpSSH = require('gulp-ssh')

var buildTaskName = "buildingNow";
var imageTaskName = "comprogressing";
var imageTask2Name = "comprogressingDeep";
var htmlTaskName = "miniHtmling";
var removeTaskName = "renameing&&deling";
var ziping = "ziping";
var removeTaskName2 = "removeFiles";
var scpTask = "scping";
var remoteCmd = "removeCmding";
const remoteName ='root';
const remoteHost = '39.108.219.251';
const passWord = '2s6oesK9TXvBPzqd';
const remoteCmdTxPath = '/var/www/';

var config = {
  host: remoteHost,
  port: 22,
  username: remoteName,
  password : passWord
}
var gulpSSH = new GulpSSH({
  ignoreErrors: true,
  sshConfig: config
})

var configPath = {//cretor配置目录  相应参数参考 http://docs.cocos.com/creator/manual/zh/publish/publish-in-command-line.html
    "platform":"web-mobile",
    "renderMode":0,
    "debug":false,
    "webOrientation":"landscape",
    "includeEruda":false,
    "includeAnySDK":false,
    "inlineSpriteFrames":false,
    "mergeStartScene":false,
    "md5cache":true,
    "excludedModules":[]
}
var projectName = "ZCode"
var creatorPath = 'E://tool-realy//creator//CocosCreator_v1.10.0-preview.3//CocosCreator.exe';//creator程序所在位置  //TODO 修改相应路径
var projectDir = "./";//项目工程位置  //TODO 修改为对应项目 NOTE 默认读取当前目录作为项目根路径
var desPath = projectDir+"build//";//打出包的路径
var workPath = desPath+"//web-mobile//";//gulp压图 瘦身工作目录

configPath.buildPath = desPath;
var configStr = "";
for (var key in configPath) {
    if (!configPath.hasOwnProperty(key)) continue;
    configStr = configStr + (key+"="+configPath[key]+";");
}

//shell命令  用于打包
var shellCmd = ''+creatorPath+' --path '+projectDir+ ' --build '+configStr;
var gitCheckOt = "git checkout release"
var gitPull = "git pull origin release"
gulp.task(buildTaskName, function(cb){

    del([workPath+"*"]);//删除旧的编译文件
    gulp.src(["./"])
            .pipe(shell([
                gitCheckOt,
                gitPull,
              shellCmd
            ]))
        .pipe(gulp.dest(workPath))
        .on("end", cb);
})

/** 浅度压缩 */
gulp.task(imageTask2Name,[buildTaskName], function (cb) {
       gulp.src([workPath+"/**/*.{jpg,gif,ico}"])
        .pipe(imagemin([
            imagemin.gifsicle({interlaced: true}),
            imagemin.jpegtran({progressive: true}),
            imagemin.optipng({optimizationLevel: 5})
        ]))
       .pipe(gulp.dest(workPath))
        .on("end", cb);
});

/** 深度压缩 */
gulp.task(imageTaskName,[imageTask2Name], function (cb) {
    const gulpPngquant = require('gulp-pngquant');
    gulp.src([workPath+"/**/*.png"])
            .pipe(gulpPngquant({
              quality: '75-90'
          }))
        .pipe(gulp.dest(workPath))
        .on("end", cb);
});

gulp.task(htmlTaskName, [imageTaskName], function (cb) {
    gulp.src(workPath+"*.html")
        .pipe(fileInline())
        .pipe(htmlmin({
            removeComments: true,//清除HTML注释
            collapseWhitespace: true,//压缩HTML
            collapseBooleanAttributes: true,//省略布尔属性的值 <input checked="true"/> ==> <input />
            removeEmptyAttributes: true,//删除所有空格作属性值 <input id="" /> ==> <input />
            removeScriptTypeAttributes: true,//删除<script>的type="text/javascript"
            removeStyleLinkTypeAttributes: true,//删除<style>和<link>的type="text/css"
            minifyJS: true,//压缩页面JS
            minifyCSS: true//压缩页面CSS
        }))
        .pipe(gulp.dest(workPath)
            .on("end", cb));
});
/** 妈的 混淆完体积增大一倍  */
// gulp.task("obfuscator", ["htmlmin"], function (cb) {
//     gulp.src([workPath+"/src/project*.js"])
//         .pipe(javascriptObfuscator({
//             compact: true,
//             domainLock: [".zz-game.com"],
//             mangle: true,
//             rotateStringArray: true,
//             selfDefending: true,
//             stringArray: true,
//             target: "browser"
//         }))
//         .pipe(gulp.dest(workPath+"/src/")
//             .on("end", cb));
// });

gulp.task(removeTaskName, [htmlTaskName], function (cb) {
    // rename.js
    const fs = require("fs");
    const oldPath = workPath
    const newPath = desPath + projectName + "//"
    const path=require('path');
    const obj1=path.parse(__dirname);
    workPath = newPath
    fs.renameSync(oldPath, newPath);

    del.sync([workPath+"/src/settings*.js", workPath+"/main*.js",workPath+"/*.css",workPath+obj1.name])
    cb()
});

gulp.task(ziping, [removeTaskName], function (cb) {
    gulp.src([workPath+"/**/*"])
        .pipe(zip(projectName+'.zip'))
        .pipe(gulp.dest(desPath)
             .on("end", cb))

});
gulp.task(removeTaskName2, [ziping], function (cb) {
    del.sync([workPath])
    cb();
});

gulp.task(scpTask, [removeTaskName2], function (cb) {
    gulp.src([desPath+projectName+'.zip'])
        .pipe(gulpSSH.dest(remoteCmdTxPath, {filePath: 'scp.log',autoExit:true}))
        .pipe(gulp.dest(desPath)
             .on("end", cb))

});
gulp.task(remoteCmd, [scpTask], function (cb) {
    gulpSSH.shell(['cd '+remoteCmdTxPath, 'rm -rf '+projectName, 'mkdir '+projectName, 'cd '+projectName, 'mv ../'+projectName+'.zip ./',"unzip "+projectName+".zip", "rm -rf "+projectName+".zip","exit"], {filePath: 'shell.log',autoExit:true})
    cb();
})

gulp.task("default", [remoteCmd], function (cb) {
    del.sync([desPath+projectName+'.zip'])
    gulpSSH = null;
});
