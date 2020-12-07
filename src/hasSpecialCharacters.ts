const special = /[\.\\\+\*\?\[\^\]\$\(\)\{\}\=\!\<\>\|\:\-\/]/;
export default function hasSpecialCharacters(str: string) {
  return special.test(str);
}
