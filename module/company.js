var mysql      = require('mysql');

exports.getLiset=(req, res)=>{


    var connection = mysql.createConnection({
        host     : 'localhost',
        user     : 'root',
        password : 'pk6*4!Hpjk#o',
        database : 'cas'
    });

    connection.connect();
    try {
        var sql = ''
        var limit = ''
        if(req.query.page){
            var page = req.query.page*1-1;
            limit = 'LIMIT '+20*page+',20';
        }else{
            limit = 'LIMIT 0,20'
        }

        if(req.query.name){
            sql = "select * from `cas_list` WHERE NAME LIKE '%"+req.query.name+"%'"+limit;
        }else{
            sql = "select * from `cas_list`"+limit;
        }

        connection.query(sql, function (error, results, fields) {
            if (error){
                send(res,{ status: 500, error});
                return;
            };
            send(res,{ status: 200, results});
        });
    } catch (error) {}
    connection.end();
}

function send(res, data){
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Content-Type,Content-Length, Authorization, Accept,X-Requested-With");
    res.header("Access-Control-Allow-Methods","PUT,POST,GET,DELETE,OPTIONS");
    res.header("X-Powered-By",' 3.2.1');
    res.send(data);
}