#include <windows.h>

#include <iostream>
#include <queue>
#include <string>
#include <unordered_map>
using namespace std;

// 노드 정보
struct Node {
    string token;  // 문자 대신 문자열 단위
    int frequency;
    Node* left;
    Node* right;
};

// 우선순위 큐 정렬 기준 (빈도수 작은 순)
struct cmp {
    bool operator()(Node* A, Node* B) {
        return A->frequency > B->frequency;
    }
};

class HuffmanTree {
   public:
    ~HuffmanTree() {
        ReleaseTree(root);
        root = nullptr;
        um.clear();
        info.clear();
        while (!pq.empty()) pq.pop();
    }

    const unordered_map<string, string>& GetInfo() {
        return info;
    }

    // 허프만 트리 생성
    void Create(const string& str, int maxN = 3) {
        // 1글자 단위는 무조건 포함
        CountTokens(str, 1);

        // 2글자 이상은 빈도수 3 이상일 때만 포함
        for (int n = 2; n <= maxN; ++n) {
            CountTokens(str, n);
        }

        // 조건에 맞는 토큰만 노드 생성
        for (const auto& iter : um) {
            if (iter.first.size() == 1 || iter.second >= 3) {
                Node* newNode = new Node;
                newNode->left = nullptr;
                newNode->right = nullptr;
                newNode->token = iter.first;
                newNode->frequency = iter.second;
                pq.push(newNode);
            }
        }

        MakeTree();
        string tmp = "";
        FindTree(root, tmp);
    }

    // 디코딩
    string DecodeFromOuts(const string& outs, size_t originalLength) {
        string bitstream;
        for (unsigned char c : outs) {
            for (int i = 7; i >= 0; --i) {
                bitstream += ((c >> i) & 1) ? '1' : '0';
            }
        }
        string result;
        Node* current = root;
        for (char bit : bitstream) {
            if (bit == '0')
                current = current->left;
            else
                current = current->right;

            if (current->left == nullptr && current->right == nullptr) {
                result += current->token;  // 토큰 복원
                current = root;
                if (result.size() >= originalLength) break;
            }
        }
        return result;
    }
    string encodeTo8BitString(const string& str) {
        string bitstream;
        for (size_t i = 0; i < str.size(); ++i) {
            string token(1, str[i]);
            bitstream += info[token];
        }
        cout << bitstream << '\n';
        string outs;
        for (size_t i = 0; i < bitstream.size(); i += 8) {
            string byteStr = bitstream.substr(i, 8);
            if (byteStr.size() < 8) {
                byteStr.append(8 - byteStr.size(), '0');
            }
            unsigned char byteVal = static_cast<unsigned char>(stoi(byteStr, nullptr, 2));
            outs += byteVal;
        }
        return outs;
    }

   private:
    unordered_map<string, int> um;
    unordered_map<string, string> info;
    priority_queue<Node*, vector<Node*>, cmp> pq;
    Node* root = nullptr;

    void CountTokens(const string& str, int n) {
        for (size_t i = 0; i + n <= str.size(); ++i) {
            string token = str.substr(i, n);
            ++um[token];
        }
    }

    void MakeTree() {
        int limit = pq.size() - 1;
        for (int i = 0; i < limit; ++i) {
            Node* newNode = new Node;
            newNode->token = "";
            newNode->right = pq.top();
            pq.pop();
            newNode->left = pq.top();
            pq.pop();
            newNode->frequency = newNode->right->frequency + newNode->left->frequency;
            pq.push(newNode);
        }
        root = pq.top();
    }

    void FindTree(Node* p, string str) {
        if (p == nullptr) return;
        FindTree(p->left, str + '0');
        FindTree(p->right, str + '1');
        if (!p->token.empty()) {
            info[p->token] = str;
        }
    }

    void ReleaseTree(Node* p) {
        if (p == nullptr) return;
        ReleaseTree(p->left);
        ReleaseTree(p->right);
        delete p;
        p = nullptr;
    }
};

int main() {
    SetConsoleOutputCP(CP_UTF8);
    SetConsoleCP(CP_UTF8);
    string str;
    getline(cin, str);

    HuffmanTree t;
    t.Create(str);

    unordered_map<string, string> info = t.GetInfo();
    cout << "허프만 코드 정보:\n";
    for (const auto& iter : info) {
        cout << iter.first << ": " << iter.second << endl;
    }

    cout << "\n8비트 단위 변환 결과:\n";
    string outs = t.encodeTo8BitString(str);
    cout << outs << '\n';

    cout << "\n길이 비교\n str : " << str.size() << " outs : " << outs.size();
    cout << "\n압축률 : " << (float)outs.size() / (float)str.size() * 100 << "%\n";

    string decoded = t.DecodeFromOuts(outs, str.size());
    cout << "\n복원된 문자열: " << decoded;
    cout << "\n"
         << (str == decoded);
}
