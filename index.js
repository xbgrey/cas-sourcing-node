const express = require('express');
const request = require('request');
const Iconv = require('iconv-lite');
const company = require('./module/company');
const app = express();

app.all('*', function(req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Content-Type,Content-Length, Authorization, Accept,X-Requested-With");
    res.header("Access-Control-Allow-Methods","PUT,POST,GET,DELETE,OPTIONS");
    res.header("X-Powered-By",' 3.2.1')
    if(req.method=="OPTIONS") res.send(200);/*让options请求快速返回*/
    else  next();
});

///Enterprise/slist 商品列表
app.get('/Enterprise/slist', (req, res) => {
    get('http://b2b.gds.org.cn'+res.req.originalUrl, 'gb2312', (error, body) => {
        if (error) {
            send(res,{ status: 500, error});
        } else {

            //列表数据
            var sum = [];
            var listStr
            listStr = getData(body, '<table', 'table>')[0];
            listStr = getData(listStr, '<tr>', 'tr>');

            for (var i in listStr) {
                var value = listStr[i];
                // try {
                    if (!value) {
                        continue;
                    }

                    var item = getData(value, '<td', 'td>')
                    if (!item) {
                        continue;
                    }

                    var str;
                    sum.unshift({});

                    //缩略图
                    str = getData(item[0], "src='", "'")[0];
                    str = str.replace("src='", '');
                    str = str.replace("'", '');
                    sum[0].imgUrl = str;

                    //条码
                    str = getData(item[1], "<a", "a>");
                    if(str){
                        str = getA(str[0]);
                        sum[0].barcode = str;
                    }else{
                        str = getData(item[1], ">", "<")[0];
                        str = str.replace(">", '');
                        str = str.replace("<", '');
                        str = str.replace(/ /g, '');
                        str = str.replace(/\r/g, '');
                        str = str.replace(/\n/g, '');
                        sum[0].barcode = {value:str};
                    }

                    //产品名称
                    str = getData(item[2], ">", "<")[0];
                    str = str.replace(">", '');
                    str = str.replace("<", '');
                    str = str.replace(/ /g, '');
                    str = str.replace(/\r/g, '');
                    str = str.replace(/\n/g, '');
                    sum[0].name = str;

                    //品牌
                    str = getData(item[3], "<a", "a>")[0];
                    sum[0].brand = getA(str);

                    //规格
                    str = getData(item[4], ">", "<")[0];
                    str = str.replace(">", '');
                    str = str.replace("<", '');
                    str = str.replace(/ /g, '');
                    str = str.replace(/\r/g, '');
                    str = str.replace(/\n/g, '');
                    sum[0].specification = str;

                    //分类
                    str = getData(item[5], "<a", "a>")[0];
                    sum[0].type = getA(str);

                    //时间
                    str = getData(item[6], ">", "<")[0];
                    str = str.replace(">", '');
                    str = str.replace("<", '');
                    str = str.replace(/ /g, '');
                    str = str.replace(/\r/g, '');
                    str = str.replace(/\n/g, '');
                    sum[0].date = str;

                    //企业
                    str = getData(item[7], "<a", "a>")[0];
                    sum[0].enterprise = getA(str);

                    //来源
                    str = getData(item[8], "<a", "a>")[0];
                    sum[0].source = getA(str);
                // } catch (error) {
                //     res.send({ status: 500 });
                //     return;
                // }
            }

            //分页数据
            try {
                var pstr = body.match(/第[0-9]*页\/共[0-9]*页/g);
                pstr = pstr[0];
                pstr = pstr.replace(/第/g, '');
                pstr = pstr.replace(/页/g, '');
                pstr = pstr.split('/共');
            } catch (error) {
                send(res,{ status: 501 });
                return;
            }

            send(res,{
                status: 200,
                ok:true,
                dataList: sum,
                pagination: {
                    current: pstr[0],
                    total: pstr[1]
                }
            });
        }
    });
});

///Home/ProDetailService 商品信息
app.get('/Home/ProDetailService', (req, res)=>{
    get('http://so.anccnet.com'+res.req.originalUrl, 'utf-8', (error, body) => {
        if(error){
            send(res,{status:501, error});
        }else{
            try {
                var among

                //企业信息
                var corporateStr = getData(body, '<section id="company">', 'section>')[0];
                var corporate = {};
                among = corporateStr.match(/品牌拥有者[^]*?<\/li>/g)
                if(among && among.length){
                    among = among[0];
                    among = among.replace('品牌拥有者：</p><p>','');
                    among = among.replace('</p></li>','');
                    corporate.owner = {value:among,title:'品牌拥有者'};
                }

                among = corporateStr.match(/联系电话[^]*?<\/li>/g)
                if(among && among.length){
                    among = among[0];
                    among = among.replace('联系电话：</p><p>','');
                    among = among.replace('</p></li>','');
                    corporate.phone = {value:among,title:'联系电话'};
                }

                among = corporateStr.match(/条码使用年限[^]*?<\/li>/g)
                if(among && among.length){
                    among = among[0];
                    among = among.replace('条码使用年限：</p><p>','');
                    among = among.replace('</p></li>','');
                    corporate.barCodeAge = {value:among,title:'条码使用年限'};
                }

                among = corporateStr.match(/注册日期[^]*?<\/li>/g)
                if(among && among.length){
                    among = among[0];
                    among = among.replace('注册日期：</p><p>','');
                    among = among.replace('</p></li>','');
                    corporate.registrationDate = {value:among,title:'注册日期'};
                }

                //制造商
                var factoryStr = getData(body, '<section id="manufacturer">', 'section>')[0];
                var factory = {};
                
                among = factoryStr.match(/制造商\/进口商[^]*?<\/li>/g)
                if(among && among.length){
                    among = among[0];
                    among = among.replace('制造商/进口商</p><p>','');
                    among = among.replace('</p></li>','');
                    factory.name = {value:among,title:'制造商/进口商'};
                }

                among = factoryStr.match(/产地\/原产国[^]*?<\/li>/g)
                if(among && among.length){
                    among = among[0];
                    among = among.replace('产地/原产国：</p><p>','');
                    among = among.replace('</p></li>','');
                    factory.area = {value:among,title:'产地/原产国'};
                }

                among = factoryStr.match(/生产许可证编号[^]*?<\/li>/g)
                if(among && among.length){
                    among = among[0];
                    among = among.replace('生产许可证编号：</p><p>','');
                    among = among.replace('</p></li>','');
                    factory.production = {value:among,title:'生产许可证编号'};
                }

                among = factoryStr.match(/生产企业地址\/进口企业地址[^]*?<\/li>/g)
                if(among && among.length){
                    among = among[0];
                    among = among.replace('生产企业地址/进口企业地址：</p><p>','');
                    among = among.replace('</p></li>','');
                    factory.address = {value:among,title:'生产企业地址/进口企业地址'};
                }

                among = factoryStr.match(/自定义属性[^]*?<\/li>/g)
                if(among && among.length){
                    among = among[0];
                    among = among.replace('自定义属性：</p><p>','');
                    among = among.replace('</p></li>','');
                    factory.properties = {value:among,title:'自定义属性'};
                }

                among = factoryStr.match(/内装商品条码：[^]*?<\/li>/g)
                if(among && among.length){
                    among = among[0];
                    among = among.replace('内装商品条码：</p><p>','');
                    among = among.replace('</p></li>','');
                    factory.builtIn = {value:among,title:'内装商品条码'};
                }

                //测量信息

                //商品图片信息
                var picture = getData(body, '<section class="tab tab-img">', 'section>')[0];
                picture = picture.match(/<img[^*]*?>/g);
                for(var i=0; i<picture.length; i++){
                    var url = picture[i];
                    console.log('====>',url)
                    if(url.indexOf('class')>=0){
                        picture.splice(i,1);
                        i--;
                        continue;
                    }

                    url = url.match(/<img src="[^"]*?"/g)[0];
                    url = url.replace('<img src=','');
                    url = url.replace(/"/g,'');
                    picture[i] = url;
                }

                //二维码
                var qrCode = getData(body, '<section class="tab tab-code">', 'section>')[0];
                qrCode = qrCode.match(/<img[^*]*?>/g);
                if(qrCode){
                    qrCode = qrCode[0];
                    qrCode = qrCode.match(/<img src="[^"]*?"/g)[0];
                    qrCode = qrCode.replace('<img src=','');
                    qrCode = qrCode.replace(/"/g,'');
                }

                //条形码
                var barcode = getData(body, '<div id="code">', 'div>')[0];
                barcode = barcode.match(/<img[^*]*?>/g);
                if(barcode){
                    barcode = barcode[0];
                    barcode = barcode.match(/<img src="[^"]*?"/g)[0];
                    barcode = barcode.replace('<img src=','');
                    barcode = barcode.replace(/"/g,'');
                }

                //商品数据
                var productStr = getData(body, '<section id="attr-side">', 'section>')[0];
                var product = {}

                among = productStr.match(/条码：[^]*?<\/li>/g)
                if(among.length){
                    among = among[0];
                    among = among.replace('条码：</p><p>','');
                    among = among.replace('</p></li>','');
                    product.barcode = {value:among,title:'条码'};
                }

                among = productStr.match(/>名称[^]*?<\/li>/g)
                if(among.length){
                    among = among[0];
                    among = among.replace('>名称：</p><p>','');
                    among = among.replace('</p></li>','');
                    product.name = {value:among,title:'名称'};
                }

                among = productStr.match(/GPC分类[^]*?<\/li>/g)
                if(among.length){
                    among = among[0];
                    among = among.replace('GPC分类：</p><p>','');
                    among = among.replace('</p></li>','');
                    product.gpc = {value:among,title:'GPC分类'};
                }

                among = productStr.match(/商品条码有效日期[^]*?<\/li>/g)
                if(among.length){
                    among = among[0];
                    among = among.replace('商品条码有效日期：</p><p>','');
                    among = among.replace('</p></li>','');
                    product.barcodeDate = {value:among,title:'商品条码有效日期'};
                }

                among = productStr.match(/>品牌[^]*?<\/li>/g)
                if(among.length){
                    among = among[0];
                    among = among.replace('>品牌：</p><p>','');
                    among = among.replace('</p></li>','');
                    product.brand = {value:among,title:'品牌'};
                }

                among = productStr.match(/子品牌[^]*?<\/li>/g)
                if(among.length){
                    among = among[0];
                    among = among.replace('子品牌：</p><p>','');
                    among = among.replace('</p></li>','');
                    product.subBrand = {value:among,title:'子品牌'};
                }

                among = productStr.match(/特征变量[^]*?<\/li>/g)
                if(among.length){
                    among = among[0];
                    among = among.replace('特征变量：</p><p>','');
                    among = among.replace('</p></li>','');
                    product.trait = {value:among,title:'特征变量'};
                }

                among = productStr.match(/功能名称[^]*?<\/li>/g)
                if(among.length){
                    among = among[0];
                    among = among.replace('功能名称：</p><p>','');
                    among = among.replace('</p></li>','');
                    product.trait = {value:among,title:'功能名称'};
                }

                among = productStr.match(/净含量：[^]*?<\/li>/g)
                if(among.length){
                    among = among[0];
                    among = among.replace('净含量：</p><p>','');
                    among = among.replace('</p></li>','');
                    product.weight = {value:among,title:'净含量'};
                }

                among = productStr.match(/净含量描述[^]*?<\/li>/g)
                if(among.length){
                    among = among[0];
                    among = among.replace('净含量描述：</p><p>','');
                    among = among.replace('</p></li>','');
                    product.description = {value:among,title:'净含量描述'};
                }

                among = productStr.match(/用法（食用\/使用方法）[^]*?<\/li>/g)
                if(among.length){
                    among = among[0];
                    among = among.replace('用法（食用/使用方法）：</p><p>','');
                    among = among.replace('</p></li>','');
                    product.usage = {value:among,title:'用法（食用/使用方法）'};
                }

                among = productStr.match(/保质期[^]*?<\/li>/g)
                if(among.length){
                    among = among[0];
                    among = among.replace('保质期：</p><p>','');
                    among = among.replace('</p></li>','');
                    product.shelfLife = {value:among,title:'保质期'};
                }

                among = productStr.match(/注意事项\/安全提示[^]*?<\/li>/g)
                if(among.length){
                    among = among[0];
                    among = among.replace('注意事项\/安全提示：</p><p>','');
                    among = among.replace('</p></li>','');
                    product.safety = {value:among,title:'注意事项\/安全提示'};
                }

                among = productStr.match(/产品标准号[^]*?<\/li>/g)
                if(among.length){
                    among = among[0];
                    among = among.replace('产品标准号：</p><p>','');
                    among = among.replace('</p></li>','');
                    product.standards = {value:among,title:'产品标准号'};
                }

                among = productStr.match(/贮藏条件[^]*?<\/li>/g)
                if(among.length){
                    among = among[0];
                    among = among.replace('贮藏条件：</p><p>','');
                    among = among.replace('</p></li>','');
                    product.conditions = {value:among,title:'贮藏条件'};
                }

                among = productStr.match(/商品主宣传语[^]*?<\/li>/g)
                if(among.length){
                    among = among[0];
                    among = among.replace('商品主宣传语：</p><p>','');
                    among = among.replace('</p></li>','');
                    product.language = {value:among,title:'商品主宣传语'};
                }

                among = productStr.match(/商品其他描述语[^]*?<\/li>/g)
                if(among.length){
                    among = among[0];
                    among = among.replace('商品其他描述语：</p><p>','');
                    among = among.replace('</p></li>','');
                    product.other = {value:among,title:'商品其他描述语'};
                }

                //测量信息
                var informationStr = getData(body, '<section id="add">', 'section>')[0];
                var information = {}

                among = informationStr.match(/产品外包装尺寸高（mm）[^]*?<\/li>/g)
                if(among.length){
                    among = among[0];
                    among = among.replace('产品外包装尺寸高（mm）：</p><p>','');
                    among = among.replace('</p></li>','');
                    information.high = {value:among,title:'产品外包装尺寸高（mm）'};
                }

                among = informationStr.match(/产品外包装尺寸深（mm）[^]*?<\/li>/g)
                if(among.length){
                    among = among[0];
                    among = among.replace('产品外包装尺寸深（mm）：</p><p>','');
                    among = among.replace('</p></li>','');
                    information.depth = {value:among,title:'产品外包装尺寸深（mm）'};
                }

                among = informationStr.match(/产品外包装尺寸宽（mm）[^]*?<\/li>/g)
                if(among.length){
                    among = among[0];
                    among = among.replace('产品外包装尺寸宽（mm）：</p><p>','');
                    among = among.replace('</p></li>','');
                    information.width = {value:among,title:'产品外包装尺寸宽（mm）'};
                }

                among = informationStr.match(/产品含外包装重量（g）[^]*?<\/li>/g)
                if(among.length){
                    among = among[0];
                    among = among.replace('产品含外包装重量（g）：</p><p>','');
                    among = among.replace('</p></li>','');
                    information.weight = {value:among,title:'产品含外包装重量（g）'};
                }

                send(res,{
                    status: 200,
                    corporate,
                    factory,
                    picture,
                    qrCode,
                    barcode,
                    product,
                    information
                });
            } catch (error) {
                send(res,{ status: 502, error});
            }
        }
    })
})

//company 公司列表接口
app.get('/company', company.getLiset);

function getA(content) {
    var value = getData(content, ">", "<")[0];
    value = value.replace(">", '');
    value = value.replace("<", '');
    value = value.replace(/ /g, '');

    var obg = {};
    var par = getData(content, 'href=', '>')[0];
    par = par.replace('href=', '');
    par = par.replace('>', '');
    par = par.replace(/\"/g, '');
    par = par.replace(/\'/g, '');

    par.split('?')[1].split('&').forEach(value => {
        if (!value) {
            return;
        }
        var arr = value.split('=');
        if (arr.length != 2) {
            return;
        }

        obg[arr[0]] = arr[1];
    });

    return { ...obg, value };
}

//通过关机头尾获取数据
function getData(content, head, end) {

    var regular = eval('/' + head + '[^*]*?' + end + '/g');
    content = content.replace(/\*/g, 'qqovaavopp');
    content = content.match(regular);
    for (var i in content) {
        content[i] = content[i].replace(/qqovaavopp/g, '*');
    }
    return content;
}

function get(url, encoding, callback) {
    console.log('--->',url);
    request({url:url, encoding:null}, (error, response, body) => {
        if (error) {
            callback(error);
        } else {
            //gb2312 utf-8
            callback(null, Iconv.decode(body, encoding).toString());
        }
    });
}

function send(res, data){
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Content-Type,Content-Length, Authorization, Accept,X-Requested-With");
    res.header("Access-Control-Allow-Methods","PUT,POST,GET,DELETE,OPTIONS");
    res.header("X-Powered-By",' 3.2.1');
    res.send(data);
}

app.listen(4000);