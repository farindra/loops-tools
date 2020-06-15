/** define ora library for spinner effect */

const ora = require('ora');

const spinner = ora('Please Wait...');

/** define moment library for date manipulation */

const moment = require('moment');

/** object method of library */

const lib = {

    /**
     * Lib for validating strings is date
     * 
     * @param {string=}  text format 'YYYY-MM-DD'
     * @return {boolean} 
     */
    isDate : (text) => {
        
        const date = new Date(text);


        if (Object.prototype.toString.call(date) === '[object Date]') {
            
            if ( isNaN(date.getTime()) == false ) {  

                return true;

            } 
            
        }


        return false;

    },

    /**
     * alternative for timout promise
     * 
     * @param {number=} ms in millisecond
     */
    waitFor : (ms) => new Promise(r => setTimeout(r, ms)),

    /**
     * alternative for foreach async
     * 
     * @param {Array} array
     * @param {Function} callback The callback that handles the response
     */
    asyncForEach : async (array, callback) => {
        
        for (let index = 0; index < array.length; index++) {

            await callback(array[index], index, array);

        }

    },

    /**
     * normalize query from log text
     * 
     * @param {string=} text
     */
    normalizeLogQuery : async (text) => {
        
        try{

            // filter text if not contain "(SQL: " & ")) {" 

            if (!text.includes('(SQL: ') || !text.includes(')) {')) {

                return '#none';
           
            }


            const start = text.indexOf('(SQL: ', 0) + 6;

            const end = text.indexOf(')) {', 0) + 1 ;

            const timeStamp = `# ${text.substring( 0, start-6)}`;

            // grab sql query

            const sql_all = text.substring( start, end).split(' values ') ;

            const attribute = sql_all[0];

            const value_split = sql_all[1]

            let query = [];

            // put it into ${query} variable

            value_split.substring(1, sql_all[1].length - 1).split(', ').forEach( (item ) => {
    

                if (item.trim()!== '') {

                    query.push(`'${item}'`);

                } else {
                  
                    query.push(`''`);
               
                }

    
            });

            return (`\n\n${timeStamp}\n${attribute} values (${query.join(',')});`);

        }catch(error){

            console.log(error);

            process.exit(1);

        }
        
    },

    /**
     * method to write text into  file
     * 
     * @param {string=} text
     * @param {string=} filename
     */
    writeAppendToFile : async (text, filename) => {

        let fs = require('fs');
        
        try {
           
            fs.writeFileSync( filename, text, function(err) {


                if (err) {
                   
                    return console.log(err);

                    process.exit(1);
                }

               
               
            });

        } catch(error) {

            console.log(error);

            process.exit(1);

        }

        return true;

        
    }

};

/** object methods of conversion */

const convert = {

    /**
     * conver log file into query file
     */
    fileToQuery : () => {
        
        console.log(`\nRunning Tools - Get Query From Log ( laravel log file )\n${('=').repeat(70)}\n`);

        spinner.start('Checking Log File');


        // Make sure we got a filename on the command line 1st arg, if not return notice
        
        if (process.argv.length < 3) {

            spinner.fail('Filename Attribute Not Found');
       
            console.log(`Usage: node ${process.argv[1]} FILENAME`);
       
            return;
       
        }


        // Read the file and print its contents.

        let fs = require('fs')
        , filename = process.argv[2];

        fs.readFile(filename, 'utf8',  async (err, data) => {
                
            if (err) {

                spinner.fail( `Checking Log File error : ${err}` );

            }


            spinner.succeed();

            spinner.start('Reading Log File') ;


            try {
            
                const log_file = data.split('\n');
            
                const total_line = log_file.length;
            
                const filename = `./results/LOG-TO-QUERY-FILE-${moment().format('YYYY-MM-DD-hhmmss')}.sql`;

                const filename_other = `./results/OTHER-ERROR-${moment().format('YYYY-MM-DD-hhmmss')}.txt`;

                let sql = [], noSql = [], string = [];

                let count = 0, found = 0;
                
                let info = `Reading...`;
                
                let copy = false;


                // read each of log file 

                await lib.asyncForEach( log_file , async (item) => {

                    if ( lib.isDate( item.substring(1, 11) ) ){

                        await lib.waitFor(50); // <--- give count effect delay for 50ms


                        // find line contain string 'SQLSTATE' and set copy to true 

                        if (item.includes('SQLSTATE')){

                            found++;

                            copy = true;

                        } else {

                            copy = false;

                        }


                    }


                    // if fist 12 character is  '[stacktrace]' then set copy to false and add '__BREAK__' into text

                    if ( item.substring(0, 12) === '[stacktrace]'){

                        string.push('_BREAK_');

                        copy = false;

                    }


                    // do record current line in into array of SQL query or Not
                    
                    if (!copy){

                        noSql.push(item);
                    
                    }else{

                        string.push(item);

                    }


                    count++;

                    info = `Reading Line : ${count} of ${total_line} | Found Queries: ${found}`;

                    spinner.text = info;
                    
                });

                // normalize string
                const string_normalize = string.join('\n').replace(/(\r\n|\n|\r)/gm,"").split('_BREAK_');
                
                spinner.succeed( info );

                spinner.start(`Write into file: ${count = 0} of ${found}` );
               
                // fetch normilize query into ${sql} variable

                await lib.asyncForEach( string_normalize , async (item) => {

                    let value =  await lib.normalizeLogQuery(item) || '#none' ;


                    if ( value !== '#none') {
                        
                        await lib.waitFor(50);

                        sql.push( value );

                        count++;
                        
                        spinner.text = `Write into file: ${count} of ${found}`;
                    }

                        
                });

                // write both data ${sql} and ${noSql} into file
                const sql_file = await lib.writeAppendToFile( sql.join('\n') , filename );
                
                const noSql_file = await lib.writeAppendToFile( noSql.join('\n') , filename_other );


                if (sql_file && noSql_file) {
                    
                    const  unread =  count => { return (count > 0) ? `| With unread sql line: ${count}, you can find this on OTHER-ERROR...txt file` : ''};
                
                    spinner.succeed(`Write into file: ${count} of ${found} ${unread(found - count)}`);
            
                    console.log([ 
                            `\n${('=').repeat(70)}`,
                            `\nQuery File is ready at :  ${filename}`,
                            `\nOther Error File is ready at :  ${filename_other}\n`,
                            `Success!\n`,
                        ].join('\n')
                    );


                } 


            } catch (error) {

                spinner.fail('Error');
                
                console.log(error);
                
                process.exit(1);

            }
            
        });


    }

};

// run tool
convert.fileToQuery();
    
  







