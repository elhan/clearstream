var _ = require('underscore');

exports.calculateSimilarity =  function(title1, title2) {
	// process the titles
	var title1Arr = processString(title1);
	var title2Arr = processString(title2);

	// get the union of the words
	var union = unionArrays(title1Arr, title2Arr);

	// get the occurrence
	var occ1 = createFrequencyOfOccurrenceVector(title1Arr, union);
	var occ2 = createFrequencyOfOccurrenceVector(title2Arr, union);

	var dotProduct = dotP(occ1, occ2);

	var magn1 = magnitude(occ1);
	var magn2 = magnitude(occ2);
	var magnProd = magn1 * magn2;

	var result = dotProduct / magnProd;
	return result;
};

/**
 * Returns string without special characters, capitalised and split by space
 */
function processString(string){
	// remove punctuation
	var punctuationless = string.replace(/[\.,-\/#!$%\^&\*;:{}=\-_`~()«»]/g,"");
	var finalString = punctuationless.replace(/\s{2,}/g," ");
	
	// create the mapping for non accent letters
    var Latinise={};
    Latinise.latin_map={"Ά":"Α","Έ":"Ε","Ή":"Η","Ί":"Ι","Ό":"Ο","Ύ":"Υ","Ώ":"Ω","Ϊ":"Ι"};
    String.prototype.latinise=function(){return this.replace(/[^A-Za-z0-9\[\] ]/g,function(a){return Latinise.latin_map[a]||a});};
    String.prototype.latinize=String.prototype.latinise;
    String.prototype.isLatin=function(){return this==this.latinise()};
    
    // convert to upper case and replace accent
    var arr = finalString.split(" ");
    arr = _.map(arr, function(num){ num = num.toUpperCase(); return num.latinize();});
    return arr;
}

/**
 * Returns the result of the union of 2 arrays
 */
function unionArrays(array1, array2){
    var unionResult = _.union(array1, array2);
    return unionResult;
}

/**
 * Returns the frequency of occurrence Vector 
 */
function createFrequencyOfOccurrenceVector(titleArr, union){
   var occurrenceVector = [];
   for(var i = 0; i < union.length; i++){
      var occ = _.reduce(titleArr, function(acc, x) { 
		   return x == union[i] ? acc + 1 : acc }, 0);
      occurrenceVector[i] = occ;
   }

   return occurrenceVector;
}

/**
 * Returns the inner product of two vectors
 */
function dotP(occ1, occ2){
   if(occ1.length != occ2.length){
      throw new VectorMathException(
         "Input Vectors do not have the" + 
         "same number of dimensions.");
   }
 
   var dotProduct = 0;
   for(var i = 0; i < occ1.length; i++){
      dotProduct += (occ1[i] * occ2[i]);
   }
   
   return dotProduct; 
}

/**
 * Calculate the Magnitude of a vector
 */
function magnitude(occ){
   var magnitudeR = 0;
   for(var i = 0; i < occ.length; i++){
      magnitudeR += Math.pow(occ[i], 2);
   }
   
   return Math.sqrt(magnitudeR);
}