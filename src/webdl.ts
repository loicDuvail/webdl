import fs from "fs";
import path from "path";

const [url, destinationFolder] = process.argv.splice(3, 2);

const clearDir = (dir: string) => {
  const files = fs.readdirSync(dir);
  files.forEach((file) => {
    const filePath = path.join(dir, file);
    if (fs.statSync(filePath).isDirectory()) {
      clearDir(filePath);
      fs.rmdirSync(filePath);
    } else fs.unlinkSync(filePath);
  });
};

const writeToDestination = async (innerPath: string, res: Response) => {
  const rootPath = path.resolve(destinationFolder);
  const destinationPath = path.join(rootPath, innerPath);
  const finalDir = path.join(destinationPath, "../");

  if (!fs.existsSync(finalDir)) {
    fs.mkdirSync(finalDir, { recursive: true });
  }
  const buffer = Buffer.from(await res.arrayBuffer());
  fs.writeFile(destinationPath, buffer, () =>
    console.log(`file downloaded, path: ${innerPath}`)
  );
};

const getLinks = (html: string) => {
  const links = Array.from(
    html.matchAll(
      /(?<=<((link)|(script)|(img)|(video))[^>]+((href)|(src)|(poster))=['"])[^'"]*(?=['"])|(?<=<style>.*url\()[^)]+(?=.*<\/style>)/g
    )
  ).map((val) => val[0]);

  const srcsets = html.matchAll(/(?<=srcset=")[^"]+/g);
  Array.from(srcsets)
    .map((val) => val[0])
    .forEach((srcset) => {
      const srcsetLinks = srcset.matchAll(/[^ ]*/g);
      Array.from(srcsetLinks)
        .map((val) => val[0])
        .forEach((link) => {
          if (!"0987654321".includes(link[0])) links.push(link);
        });
    });

  return links.filter((link) => link != "");
};

//----------------- script ------------------//

console.log(path.resolve(destinationFolder));
clearDir(path.resolve(destinationFolder));

fetch(url).then(async (response) => {
  const html = (await response.text())
    .replace(/<base [^>]*>/g, "")
    .replace(/(?<=((src)|(href))=")[^"]*/g, (link) => {
      if (link[0] === "/") link = link.substring(1);
      return link;
    });
  fs.writeFile(
    path.join(path.resolve(destinationFolder), "index.html"),
    Buffer.from(html),
    () => {}
  );
  const links = getLinks(html);
  links.forEach((link) => {
    const linkUrl = path.join(url, link);
    fetch(linkUrl)
      .then((res) => writeToDestination(link, res))
      .catch((e) => console.error(`Couldn't download ${link}\n${e}`));
  });
});
