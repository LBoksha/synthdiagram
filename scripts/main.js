let myImage = document.querySelector('img');

myImage.onclick = function() {
    let mySrc = myImage.getAttribute('src');
    if(mySrc === 'images/test-image.png') {
      myImage.setAttribute('src','images/test-image2.png');
    } else {
      myImage.setAttribute('src','images/test-image.png');
    }
}