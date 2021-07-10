export default class ConversionHelpers {
  stripTags (input, saveLineBreaks = true) {
    let div = document.createElement('div');
    div.innerHTML = input.replace(/<br>/gmi, '[[[BR]]]').replace(/<br \/>/gmi, '[[[BR]]]').replace(/<br\/>/gmi, '[[[BR]]]');
    // eslint-disable-next-line
    let output = div.innerText.replace(/\[\[\[BR\]\]\]/gmi, "\n");

    return output;
  }
}
